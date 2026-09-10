import { formatCurrency, formatDate, formatNumber, isolate, money } from '@dahab/i18n/server';
import { Button, DataTable, Mark, Panel, StatusPill } from '@dahab/ui-web';
import type { Column, MarkName, StatusTone } from '@dahab/ui-web';

import { ConsolePage, resolveLocale } from '@/components/ConsoleShell';
import { translator } from '@/lib/i18n';
import { AT_RISK, BOOKINGS, CASCADE, partyCounts } from '@/lib/bookings';
import type { Booking, BookingStatus, CascadeKind, CascadeStep, ParticipantKind } from '@/lib/bookings';

/**
 * A05 · Bookings and operations.
 *
 * The screen exists for one reason: "weather cancels boats, and cancellation
 * is a first-class, cascading operation". A status dropdown would let an
 * operator cancel a Thursday boat without ever seeing that it also cancels the
 * 07:10 transfer that fed it and opens three refunds. So the cascade is shown
 * BEFORE the action, as a preview, and committing it is one deliberate button.
 */

const TONE: Record<BookingStatus, StatusTone> = {
  pendingPayment: 'warning',
  confirmed: 'success',
  awaitingVendor: 'warning',
  cancelledByTraveler: 'neutral',
  cancelledByVendor: 'neutral',
  cancelledByWeather: 'info',
  noShow: 'neutral',
  completed: 'success',
  refunded: 'info',
  disputed: 'danger',
};

const STATUS_MARK: Record<BookingStatus, MarkName> = {
  pendingPayment: 'firstAid',
  confirmed: 'eco',
  awaitingVendor: 'chat',
  cancelledByTraveler: 'pass',
  cancelledByVendor: 'pass',
  cancelledByWeather: 'wind',
  noShow: 'pass',
  completed: 'eco',
  refunded: 'shell',
  disputed: 'sos',
};

const CASCADE_MARK: Record<CascadeKind, MarkName> = {
  bookings: 'pass',
  transfer: 'camel',
  refunds: 'shell',
  ledger: 'weave',
  notifications: 'chat',
};

export default async function BookingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;

  const departsAt = new Date(AT_RISK.departsAt);
  const seatsUsed = BOOKINGS.filter((b) => b.service === AT_RISK.service).reduce(
    (total, booking) => total + partyCounts(booking.party).capacity,
    0,
  );

  const columns: readonly Column<Booking>[] = [
    {
      key: 'ref',
      header: t('admin.col4.ref'),
      width: '8rem',
      cell: (row) => <span className="font-mono text-small text-text">{row.ref}</span>,
    },
    {
      key: 'service',
      header: t('admin.col.service'),
      cell: (row) => (
        <span className="block">
          <span className="block text-body text-text">{row.service}</span>
          <span className="block text-small text-text-muted">{row.vendor}</span>
        </span>
      ),
    },
    {
      key: 'traveler',
      header: t('admin.col4.traveler'),
      cell: (row) => row.traveler,
      width: '11rem',
    },
    {
      key: 'party',
      header: t('admin.col4.party'),
      width: '15rem',
      cell: (row) => {
        const counts = partyCounts(row.party);
        return (
          <span className="flex flex-col">
            <span className="text-small text-text">
              {Object.entries(row.party)
                .map(([kind, count]) => `${count}× ${t(`admin.party.${kind as ParticipantKind}`)}`)
                .join(' · ')}
            </span>
            {counts.chargeable === counts.capacity ? null : (
              // The distinction the boat's headcount depends on, surfaced
              // rather than left to arithmetic: seats held vs seats billed.
              <span className="text-caption text-text-muted">
                {formatNumber(counts.capacity, context)} / {formatNumber(counts.chargeable, context)}
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: 'departs',
      header: t('admin.col4.departs'),
      width: '12rem',
      cell: (row) => formatDate(new Date(row.departsAt), context, 'dateTime'),
    },
    {
      key: 'status',
      header: t('admin.col.status'),
      width: '14rem',
      cell: (row) => (
        <StatusPill tone={TONE[row.status]} mark={STATUS_MARK[row.status]}>
          {t(`admin.bookingStatus.${row.status}`)}
        </StatusPill>
      ),
    },
    {
      key: 'total',
      header: t('admin.col4.total'),
      numeric: true,
      width: '10rem',
      cell: (row) => formatCurrency(money(row.total.amountMinor, row.total.currency), context),
    },
  ];

  return (
    <ConsolePage
      locale={locale}
      current="bookings"
      title={t('admin.bookings.title')}
      subtitle={t('admin.bookings.subtitle')}
    >
      <div className="flex flex-col gap-8">
        {/* The wind warning, and the cascade it implies. */}
        <section className="rounded-xl bg-warning-surface">
          <header className="flex items-start gap-3 px-6 pt-5">
            <Mark name="wind" size={24} noFlip className="mt-1 shrink-0" />
            <div>
              <h2 className="font-display text-h2 text-warning-text">{t('admin.bookings.risk')}</h2>
              <p className="mt-1 max-w-prose text-body text-warning-text">
                {t('admin.bookings.riskSub', {
                  forecast: AT_RISK.windForecastKt,
                  limit: AT_RISK.windLimitKt,
                  service: AT_RISK.service,
                  when: isolate(formatDate(departsAt, context, 'dateTime')),
                })}
              </p>
              <p className="mt-2 text-small text-warning-text">
                {t('admin.bookings.seats', {
                  used: formatNumber(seatsUsed, context),
                  total: formatNumber(AT_RISK.capacity, context),
                })}
              </p>
            </div>
          </header>

          <div className="mt-5 rounded-xl bg-surface p-6">
            <h3 className="font-display text-h3 text-text">{t('admin.bookings.cascadeTitle')}</h3>
            <p className="mt-1 text-small text-text-muted">{t('admin.bookings.cascadeSub')}</p>

            <ol className="mt-4 flex flex-col gap-3">
              {CASCADE.map((step: CascadeStep) => (
                <li
                  key={step.kind}
                  className="flex items-start gap-4 rounded-lg bg-bg px-4 py-3"
                >
                  <Mark name={CASCADE_MARK[step.kind]} size={24} className="mt-1 shrink-0" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-body text-text">{t(`admin.cascade.${step.kind}`)}</span>
                    <span className="text-small text-text-muted">{step.detail.join(' · ')}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="font-display text-h3 tabular-nums text-text">
                      {formatNumber(step.count, context)}
                    </span>
                    {step.amount === undefined ? null : (
                      <span className="text-small text-text-muted">
                        {formatCurrency(money(step.amount.amountMinor, step.amount.currency), context)}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>

            {/*
              Why refunds (3) is less than bookings (4). Without this the
              numbers look like a bug, and an operator who thinks the console
              is buggy stops trusting the rest of it.
            */}
            <p className="mt-3 flex items-start gap-2 text-small text-text-muted">
              <Mark name="chat" size={16} className="mt-1 shrink-0" />
              {t('admin.cascade.releasedNote')}
            </p>

            <div className="mt-5 flex items-center gap-3">
              <Button variant="primary" mark="wind">
                {t('admin.bookings.commit')}
              </Button>
              <Button variant="secondary">{t('admin.bookings.keep')}</Button>
            </div>
          </div>
        </section>

        <Panel title={t('admin.bookings.all')} mark="pass" flush>
          <p className="flex items-start gap-2 px-6 pb-3 text-small text-text-muted">
            <Mark name="diver" size={16} className="mt-1 shrink-0" />
            {t('admin.bookings.chargeableNote')}
          </p>
          <DataTable
            columns={columns}
            rows={BOOKINGS}
            rowKey={(row) => row.id}
            caption={t('admin.bookings.all')}
          />
        </Panel>
      </div>
    </ConsolePage>
  );
}
