import { formatCurrency, formatDate, money } from '@dahab/i18n/server';

import {
  Panel,
  Pill,
  RecordList,
  type RecordColumn,
  type Tone,
} from '@/components/console';
import { ConsolePage, resolveLocale } from '@/components/ConsoleShell';
import { DataProblemNotice } from '@/components/DataProblemNotice';
import { api, load } from '@/lib/api';
import { translator } from '@/lib/i18n';

/**
 * A06 · Money.
 *
 * The ledger is the part that had to be got right. It is double-entry and
 * append-only, corrected by REVERSAL rather than by edit — so this screen has
 * no edit affordance on an entry at all, and shows each event's legs summing
 * to zero rather than asserting that they do.
 *
 * Balances lead, because a balance here is a SUM over an account and nothing
 * else. The eight accounts together come to zero, which is the single number
 * that says the books are whole; if it ever is not zero, this screen is where
 * that becomes visible.
 *
 * Payouts state gross, commission, fees and net as four figures rather than
 * one, because an operator querying a payout is querying exactly that gap —
 * and all four are read back off the ledger rather than stored beside it.
 */

type Balance = Awaited<ReturnType<typeof api.admin.ledgerBalances.query>>[number];
type Payment = Awaited<ReturnType<typeof api.admin.payments.query>>[number];
type Payout = Awaited<ReturnType<typeof api.admin.payouts.query>>[number];
type LedgerEvent = Awaited<ReturnType<typeof api.admin.ledger.query>>[number];

const PAYMENT_TONE: Record<string, Tone> = {
  initiated: 'neutral',
  pending: 'warning',
  authorized: 'info',
  captured: 'success',
  failed: 'danger',
  cancelled: 'neutral',
  refunded: 'info',
  partiallyRefunded: 'info',
  chargeback: 'danger',
};

const PAYOUT_TONE: Record<string, Tone> = {
  scheduled: 'info',
  processing: 'warning',
  paid: 'success',
  failed: 'danger',
  cancelled: 'neutral',
};

export default async function MoneyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;

  const [balances, payouts, ledger, payments] = await Promise.all([
    load(() => api.admin.ledgerBalances.query()),
    load(() => api.admin.payouts.query()),
    load(() => api.admin.ledger.query({ limit: 12 })),
    load(() => api.admin.payments.query({ limit: 40 })),
  ]);

  const cash = (amountMinor: number, currency: Balance['currency']) =>
    formatCurrency(money(amountMinor, currency), context);

  // The whole-books figure. Every group was written balanced, so this is
  // zero — and it is computed here rather than trusted, because the day it
  // stops being zero is the day it matters most.
  const wholeLedger = balances.ok
    ? balances.data.reduce((total, row) => total + row.balanceMinor, 0)
    : null;

  const balanceColumns: readonly RecordColumn<Balance>[] = [
    {
      key: 'account',
      role: 'primary',
      header: t('admin.col5.account'),
      // The name only. The account code and the leg count share the quiet
      // line below it — an accountant wants the code, but a phone row that
      // stacks a name, a code and then a bare "42" reads as three facts with
      // two labels between them.
      cell: (row) => t(`admin.account.${row.account}`),
    },
    {
      key: 'legs',
      role: 'secondary',
      header: t('admin.col5.legs'),
      width: '8rem',
      cell: (row) =>
        `${row.account} · ${t('admin.money.legCount', { count: row.legs })}`,
    },
    {
      key: 'balance',
      role: 'end',
      header: t('admin.col5.balance'),
      numeric: true,
      width: '14rem',
      cell: (row) => (
        <span className="font-figure tabular-nums text-c-text">
          {cash(row.balanceMinor, row.currency)}
        </span>
      ),
    },
  ];

  const paymentColumns: readonly RecordColumn<Payment>[] = [
    {
      key: 'ref',
      role: 'primary',
      header: t('admin.col4.ref'),
      width: '8rem',
      cell: (row) => <span className="font-mono text-cMeta text-c-text">{row.bookingReference}</span>,
    },
    {
      key: 'provider',
      role: 'secondary',
      header: t('admin.col5.provider'),
      cell: (row) => (
        <span className="block">
          <span className="block text-cLabel text-c-text">{t(`admin.provider.${row.provider}`)}</span>
          {row.providerReference === null ? null : (
            // The provider's own reference, because reconciling against their
            // statement is the only reason this row is on the screen.
            <span className="block font-figure text-cFigureSm text-c-muted">
              {row.providerReference}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'at',
      role: 'column',
      header: t('admin.col5.when'),
      cell: (row) => formatDate(new Date(row.at), context, 'dateTime'),
      width: '12rem',
    },
    {
      key: 'status',
      role: 'column',
      header: t('admin.col.status'),
      width: '13rem',
      cell: (row) => (
        <Pill
          tone={PAYMENT_TONE[row.status] ?? 'neutral'}
        >
          {t(`admin.paymentStatus.${row.status}`)}
        </Pill>
      ),
    },
    {
      key: 'amount',
      role: 'end',
      header: t('admin.col4.total'),
      numeric: true,
      width: '10rem',
      cell: (row) => cash(row.amountMinor, row.currency),
    },
  ];

  const payoutColumns: readonly RecordColumn<Payout>[] = [
    {
      key: 'vendor',
      role: 'primary',
      header: t('admin.col.vendor'),
      cell: (row) => row.vendorName,
      width: '14rem',
    },
    {
      key: 'provider',
      role: 'column',
      header: t('admin.col5.provider'),
      cell: (row) => t(`admin.provider.${row.provider}`),
      width: '9rem',
    },
    {
      key: 'period',
      role: 'secondary',
      header: t('admin.money.period'),
      width: '13rem',
      cell: (row) => (
        <span className="text-cMeta text-c-muted">
          {formatDate(new Date(row.periodStart), context, 'dateShort')} —{' '}
          {formatDate(new Date(row.periodEnd), context, 'dateShort')}
        </span>
      ),
    },
    {
      key: 'status',
      role: 'column',
      header: t('admin.col.status'),
      width: '11rem',
      cell: (row) => (
        <Pill
          tone={PAYOUT_TONE[row.status] ?? 'neutral'}
        >
          {t(`admin.payoutStatus.${row.status}`)}
        </Pill>
      ),
    },
    {
      key: 'gross',
      role: 'column',
      header: t('admin.money.gross'),
      numeric: true,
      cell: (row) => cash(row.grossMinor, row.currency),
    },
    {
      key: 'commission',
      role: 'column',
      header: t('admin.money.commission'),
      numeric: true,
      cell: (row) => cash(row.commissionMinor, row.currency),
    },
    {
      key: 'fees',
      role: 'column',
      header: t('admin.money.fees'),
      numeric: true,
      cell: (row) => cash(row.feesMinor, row.currency),
    },
    {
      key: 'net',
      role: 'column',
      header: t('admin.money.net'),
      numeric: true,
      cell: (row) => (
        <span className="font-figure tabular-nums text-c-text">
          {cash(row.netMinor, row.currency)}
        </span>
      ),
    },
  ];

  return (
    <ConsolePage
      locale={locale}
      current="money"
      title={t('admin.money.title')}
      subtitle={t('admin.money.subtitle')}
      headerEnd={
        // No exchange-rate feed is wired up, so no rate is shown. A stale or
        // invented EUR/EGP rate on the money screen would be quoted at a
        // counter in Masbat within a week.
        <span className="flex flex-col items-end rounded-c-sm bg-c-info-bg px-4 py-2">
          <span className="text-cMeta text-c-muted">{t('admin.money.fxTitle')}</span>
          <span className="text-cMeta text-c-text">{t('admin.money.noFxSource')}</span>
        </span>
      }
    >
      <div className="flex flex-col gap-8">
        {!balances.ok ? (
          <DataProblemNotice problem={balances.problem} t={t} title={t('admin.money.balances')} />
        ) : (
          <Panel
            title={t('admin.money.balances')}
            flush
            // Whether the books are whole. It rides in the header slot
            // rather than as a panel action, because it is the answer this
            // panel exists to give and not somewhere else to go.
            figure={
              <Pill tone={wholeLedger === 0 ? 'success' : 'danger'}>
                {wholeLedger === 0 ? t('admin.money.balanced') : t('admin.money.unbalanced')}
              </Pill>
            }
          >
            <p className="px-4 pb-2 pt-3 text-cMeta text-c-muted">{t('admin.money.balancesSub')}</p>
            <RecordList
              columns={balanceColumns}
              rows={balances.data}
              rowKey={(row) => row.account}
              caption={t('admin.money.balances')}
              empty={<p className="text-cLabel text-c-text-muted">{t('admin.money.noLedger')}</p>}
            />
          </Panel>
        )}

        {!payouts.ok ? (
          <DataProblemNotice problem={payouts.problem} t={t} title={t('admin.money.payouts')} />
        ) : (
          <Panel title={t('admin.money.payouts')} flush>
            <p className="px-4 pb-2 pt-3 text-cMeta text-c-muted">{t('admin.money.payoutsSub')}</p>
            <RecordList
              columns={payoutColumns}
              rows={payouts.data}
              rowKey={(row) => row.id}
              caption={t('admin.money.payouts')}
              empty={<p className="text-cLabel text-c-text-muted">{t('admin.money.noPayouts')}</p>}
            />
          </Panel>
        )}

        {!ledger.ok ? (
          <DataProblemNotice problem={ledger.problem} t={t} title={t('admin.money.ledger')} />
        ) : (
          <Panel title={t('admin.money.ledger')} flush>
            <p className="px-4 pb-3 text-cMeta text-c-muted">{t('admin.money.ledgerSub')}</p>
            {ledger.data.length === 0 ? (
              <div className="flex items-center gap-4 px-4 pb-6">
                <p className="text-cLabel text-c-text-muted">{t('admin.money.noLedger')}</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {ledger.data.map((event) => (
                  <LedgerCard key={event.entryGroupId} event={event} t={t} context={context} />
                ))}
              </div>
            )}
          </Panel>
        )}

        {!payments.ok ? (
          <DataProblemNotice problem={payments.problem} t={t} title={t('admin.money.payments')} />
        ) : (
          <Panel title={t('admin.money.payments')} flush>
            <RecordList
              columns={paymentColumns}
              rows={payments.data}
              rowKey={(row) => row.id}
              caption={t('admin.money.payments')}
              empty={<p className="text-cLabel text-c-text-muted">{t('admin.money.noPayments')}</p>}
            />
          </Panel>
        )}
      </div>
    </ConsolePage>
  );
}

function LedgerCard({
  event,
  t,
  context,
}: {
  event: LedgerEvent;
  t: ReturnType<typeof translator>;
  context: { locale: ReturnType<typeof resolveLocale> };
}) {
  const balance = event.legs.reduce((total, leg) => total + leg.amountMinor, 0);

  return (
    <article className="border-t border-c-edge px-4 py-4">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="flex items-baseline gap-3">
          {/* The group id, shortened. It is a UUID v7, so the leading bytes
              still sort by time and are enough to find the row. */}
          <span className="font-mono text-cMeta text-c-text">{event.entryGroupId.slice(0, 8)}</span>
          <span className="text-cLabel text-c-text">{t(`admin.event.${event.eventKind}`)}</span>
          {event.bookingReference === null ? null : (
            <span className="font-mono text-cMeta text-c-muted">{event.bookingReference}</span>
          )}
        </span>
        <span className="flex items-center gap-3">
          <span className="text-cMeta text-c-muted">
            {formatDate(new Date(event.occurredAt), context, 'dateTime')}
          </span>
          {/* Balance is shown, not assumed. A ledger that says it balances
              without proving it is worth nothing. */}
          <Pill tone={balance === 0 ? 'success' : 'danger'}>
            {balance === 0 ? t('admin.money.balanced') : t('admin.money.unbalanced')}
          </Pill>
        </span>
      </header>

      <ul className="mt-3 flex flex-col gap-1">
        {event.legs.map((leg) => (
          <li
            key={leg.id}
            className="flex items-baseline justify-between gap-4 rounded-c-sm bg-c-bg px-3 py-2"
          >
            <span className="text-cMeta text-c-text">{t(`admin.account.${leg.account}`)}</span>
            <span className="font-figure text-cMeta tabular-nums text-c-text">
              {formatCurrency(money(leg.amountMinor, leg.currency), context)}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
