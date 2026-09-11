import { formatCurrency, formatDate, formatNumber, money } from '@dahab/i18n/server';
import { DataTable, Mark, Panel, StatusPill } from '@dahab/ui-web';
import type { Column, MarkName, StatusTone } from '@dahab/ui-web';

import { ConsolePage, resolveLocale } from '@/components/ConsoleShell';
import { translator } from '@/lib/i18n';
import { FX, LEDGER, PAYMENTS, PAYOUTS, RATE_SCALE, entryBalance } from '@/lib/money';
import type { LedgerEntry, Payment, PaymentStatus, Payout, PayoutStatus } from '@/lib/money';

/**
 * A06 · Money.
 *
 * The ledger is the part that had to be got right. It is double-entry and
 * append-only, corrected by REVERSAL rather than by edit — so this screen has
 * no edit affordance on an entry at all, shows each entry's legs summing to
 * zero, and links a reversal to the entry it reverses in both directions.
 *
 * Payouts state gross, commission, fees and net as four figures rather than
 * one, because an operator querying a payout is querying exactly that gap.
 */

const PAYMENT_TONE: Record<PaymentStatus, StatusTone> = {
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

const PAYOUT_TONE: Record<PayoutStatus, StatusTone> = {
  scheduled: 'info',
  processing: 'warning',
  paid: 'success',
  failed: 'danger',
  cancelled: 'neutral',
};

const toneMark = (tone: StatusTone): MarkName =>
  tone === 'danger' ? 'sos' : tone === 'success' ? 'eco' : tone === 'warning' ? 'firstAid' : 'chat';

export default async function MoneyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;

  const cash = (amount: { amountMinor: number; currency: 'EGP' }) =>
    formatCurrency(money(amount.amountMinor, amount.currency), context);

  const paymentColumns: readonly Column<Payment>[] = [
    {
      key: 'ref',
      header: t('admin.col4.ref'),
      width: '8rem',
      cell: (row) => <span className="font-mono text-small text-text">{row.bookingRef}</span>,
    },
    { key: 'traveler', header: t('admin.col4.traveler'), cell: (row) => row.traveler },
    {
      key: 'provider',
      header: t('admin.col5.provider'),
      cell: (row) => t(`admin.provider.${row.provider}`),
      width: '10rem',
    },
    {
      key: 'at',
      header: t('admin.col5.when'),
      cell: (row) => formatDate(new Date(row.at), context, 'dateTime'),
      width: '12rem',
    },
    {
      key: 'status',
      header: t('admin.col.status'),
      width: '13rem',
      cell: (row) => (
        <StatusPill tone={PAYMENT_TONE[row.status]} mark={toneMark(PAYMENT_TONE[row.status])}>
          {t(`admin.paymentStatus.${row.status}`)}
        </StatusPill>
      ),
    },
    {
      key: 'amount',
      header: t('admin.col4.total'),
      numeric: true,
      width: '10rem',
      cell: (row) => cash(row.amount),
    },
  ];

  const payoutColumns: readonly Column<Payout>[] = [
    { key: 'vendor', header: t('admin.col.vendor'), cell: (row) => row.vendor, width: '14rem' },
    {
      key: 'provider',
      header: t('admin.col5.provider'),
      cell: (row) => t(`admin.provider.${row.provider}`),
      width: '10rem',
    },
    {
      key: 'due',
      header: t('admin.col5.due'),
      cell: (row) => formatDate(new Date(`${row.due}T00:00:00Z`), context, 'date'),
      width: '11rem',
    },
    {
      key: 'status',
      header: t('admin.col.status'),
      width: '11rem',
      cell: (row) => (
        <StatusPill tone={PAYOUT_TONE[row.status]} mark={toneMark(PAYOUT_TONE[row.status])}>
          {t(`admin.payoutStatus.${row.status}`)}
        </StatusPill>
      ),
    },
    { key: 'gross', header: t('admin.money.gross'), numeric: true, cell: (row) => cash(row.gross) },
    {
      key: 'commission',
      header: t('admin.money.commission'),
      numeric: true,
      cell: (row) => cash(row.commission),
    },
    { key: 'fees', header: t('admin.money.fees'), numeric: true, cell: (row) => cash(row.fees) },
    { key: 'net', header: t('admin.money.net'), numeric: true, cell: (row) => cash(row.net) },
  ];

  return (
    <ConsolePage
      locale={locale}
      current="money"
      title={t('admin.money.title')}
      subtitle={t('admin.money.subtitle')}
      headerEnd={
        <span className="flex flex-col items-end rounded-lg bg-info-surface px-4 py-2">
          <span className="text-caption text-text-muted">{t('admin.money.fxTitle')}</span>
          <span className="font-display text-h3 tabular-nums text-text">
            {FX.pair} {formatNumber(FX.rateScaled / RATE_SCALE, context, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 2,
            })}
          </span>
        </span>
      }
    >
      <div className="flex flex-col gap-8">
        <Panel title={t('admin.money.payouts')} mark="shell" flush>
          <p className="px-6 pb-3 text-small text-text-muted">{t('admin.money.payoutsSub')}</p>
          <DataTable
            columns={payoutColumns}
            rows={PAYOUTS}
            rowKey={(row) => row.id}
            density="compact"
            caption={t('admin.money.payouts')}
          />
        </Panel>

        <Panel title={t('admin.money.ledger')} mark="weave" flush>
          <p className="px-6 pb-4 text-small text-text-muted">{t('admin.money.ledgerSub')}</p>
          <div className="flex flex-col">
            {LEDGER.map((entry: LedgerEntry) => {
              const balance = entryBalance(entry);
              return (
                <article key={entry.id} className="border-t border-border px-6 py-4">
                  <header className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="flex items-baseline gap-3">
                      <span className="font-mono text-small text-text">{entry.id}</span>
                      <span className="text-body text-text">{entry.narrative}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-small text-text-muted">
                        {formatDate(new Date(entry.at), context, 'dateTime')}
                      </span>
                      {/* Balance is shown, not assumed. A ledger that says it
                          balances without proving it is worth nothing. */}
                      <StatusPill
                        tone={balance === 0 ? 'success' : 'danger'}
                        mark={balance === 0 ? 'eco' : 'sos'}
                      >
                        {balance === 0 ? t('admin.money.balanced') : t('admin.money.unbalanced')}
                      </StatusPill>
                    </span>
                  </header>

                  {entry.reverses === undefined && entry.reversedBy === undefined ? null : (
                    <p className="mt-2 flex items-center gap-2 text-small text-info-text">
                      <Mark name="compass" size={16} noFlip />
                      {entry.reverses === undefined
                        ? t('admin.money.reversedBy', { id: entry.reversedBy })
                        : t('admin.money.reverses', { id: entry.reverses })}
                    </p>
                  )}

                  <ul className="mt-3 flex flex-col gap-1">
                    {entry.legs.map((leg) => (
                      <li
                        key={leg.id}
                        className="flex items-baseline justify-between gap-4 rounded-sm bg-bg px-3 py-2"
                      >
                        <span className="text-small text-text">
                          {t(`admin.account.${leg.account}`)}
                        </span>
                        <span className="font-display text-small tabular-nums text-text">
                          {cash({ amountMinor: leg.amountMinor, currency: 'EGP' })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </Panel>

        <Panel title={t('admin.money.payments')} mark="pass" flush>
          <DataTable
            columns={paymentColumns}
            rows={PAYMENTS}
            rowKey={(row) => row.id}
            caption={t('admin.money.payments')}
          />
        </Panel>
      </div>
    </ConsolePage>
  );
}
