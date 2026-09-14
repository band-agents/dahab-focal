import Link from 'next/link';
import type { Route } from 'next';

import { formatCurrency, formatDate, formatNumber, isolate, money } from '@dahab/i18n/server';
import { Button, DataTable, Illo, Mark, Panel, StatusPill } from '@dahab/ui-web';
import type { Column, MarkName, StatusTone } from '@dahab/ui-web';

import { ConsolePage, resolveLocale } from '@/components/ConsoleShell';
import { DataProblemNotice } from '@/components/DataProblemNotice';
import { api, load } from '@/lib/api';
import { translator } from '@/lib/i18n';
import { sectionHref } from '@/lib/nav';

/**
 * A05 · Bookings and operations.
 *
 * The screen exists for one reason: "weather cancels boats, and cancellation
 * is a first-class, cascading operation". A status dropdown would let an
 * operator cancel a Thursday boat without ever seeing that it also opens
 * three refunds and leaves a fourth booking to be released rather than
 * refunded. So the cascade is shown BEFORE the action, computed from the same
 * rows the commit would touch, and committing it is one deliberate button.
 *
 * What the design showed and this cannot: the wind forecast that picks the
 * departure out. No weather source is connected, so nothing here claims a
 * departure is at risk. The preview instead answers "what would cancelling
 * this one do", for whichever departure is chosen — which is the part that
 * had to be true before a forecast could ever be trusted to trigger it.
 */

type Booking = Awaited<ReturnType<typeof api.admin.bookings.query>>[number];
type Departure = Awaited<ReturnType<typeof api.admin.departures.query>>[number];
type Preview = Awaited<ReturnType<typeof api.admin.cancellationPreview.query>>;
type ParticipantKind = keyof Booking['party'];

const TONE: Record<Booking['status'], StatusTone> = {
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

const STATUS_MARK: Record<Booking['status'], MarkName> = {
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

/**
 * Seats held versus heads billed. Mirrors PARTICIPANT_RULES in
 * @dahab/api-contract: an infant and an accompanying instructor are not
 * charged but do take a place, which is why a manifest and an invoice never
 * agree.
 */
const PARTICIPANT_RULES: Record<
  ParticipantKind,
  { chargeable: boolean; occupiesCapacity: boolean }
> = {
  adult: { chargeable: true, occupiesCapacity: true },
  child: { chargeable: true, occupiesCapacity: true },
  student: { chargeable: true, occupiesCapacity: true },
  resident: { chargeable: true, occupiesCapacity: true },
  infant: { chargeable: false, occupiesCapacity: true },
  instructor: { chargeable: false, occupiesCapacity: true },
};

export default async function BookingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ slot?: string }>;
}) {
  const { locale: raw } = await params;
  const { slot: requestedSlot } = await searchParams;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;

  const [bookings, upcoming] = await Promise.all([
    load(() => api.admin.bookings.query({ locale, limit: 60 })),
    load(() => api.admin.departures.query({ locale, dayOffset: 1 })),
  ]);

  // Whichever departure was asked for, else tomorrow's fullest — the one a
  // cancellation would hurt most, which is the one worth previewing first.
  const chosen = upcoming.ok ? pickDeparture(upcoming.data, requestedSlot) : null;
  const preview =
    chosen === null
      ? null
      : await load(() => api.admin.cancellationPreview.query({ slotId: chosen.id, locale }));

  const columns: readonly Column<Booking>[] = [
    {
      key: 'ref',
      header: t('admin.col4.ref'),
      width: '8rem',
      cell: (row) => <span className="font-mono text-small text-text">{row.reference}</span>,
    },
    {
      key: 'service',
      header: t('admin.col.service'),
      cell: (row) => (
        <span className="block">
          <span className="block text-body text-text">{row.serviceTitle}</span>
          <span className="block text-small text-text-muted">{row.vendorName}</span>
        </span>
      ),
    },
    {
      key: 'traveler',
      header: t('admin.col4.traveler'),
      cell: (row) => row.travelerName ?? '—',
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
                .map(
                  ([kind, total]) =>
                    `${formatNumber(total, context)}× ${t(`admin.party.${kind as ParticipantKind}`)}`,
                )
                .join(' · ')}
            </span>
            {counts.chargeable === counts.capacity ? null : (
              // Seats held against heads billed, surfaced rather than left to
              // arithmetic: the boat's headcount depends on the first number.
              <span className="text-caption text-text-muted">
                {formatNumber(counts.capacity, context)} /{' '}
                {formatNumber(counts.chargeable, context)}
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
      cell: (row) => formatDate(new Date(row.startsAt), context, 'dateTime'),
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
      cell: (row) => formatCurrency(money(row.totalMinor, row.currency), context),
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
        {/*
          Not a warning panel. The design's version was headed "wind above
          this operator's limit", and no forecast reaches this console — so
          this carries the neutral ground and says plainly that nothing is
          flagged. It turns warning-coloured on the day a weather source can
          actually flag something.
        */}
        <section className="rounded-xl bg-surface">
          <header className="flex items-start gap-3 px-6 pt-5">
            <Mark name="wind" size={24} noFlip className="mt-1 shrink-0" />
            <div>
              <h2 className="font-display text-h2 text-text">{t('admin.departures.title')}</h2>
              <p className="mt-1 max-w-prose text-body text-text-muted">
                {t('admin.cond.noSource')} · {t('admin.bookings.noRisk')}
              </p>
              {chosen === null ? null : (
                <p className="mt-2 text-small text-text-muted">
                  {t('admin.bookings.seats', {
                    used: formatNumber(chosen.booked, context),
                    total: formatNumber(chosen.capacity, context),
                  })}
                </p>
              )}
            </div>
          </header>

          <div className="mt-5 rounded-xl bg-bg p-6">
            <h3 className="font-display text-h3 text-text">{t('admin.bookings.cascadeTitle')}</h3>
            <p className="mt-1 text-small text-text-muted">{t('admin.bookings.cascadeSub')}</p>

            {!upcoming.ok ? (
              <div className="mt-4">
                <DataProblemNotice
                  problem={upcoming.problem}
                  t={t}
                  title={t('admin.departures.title')}
                />
              </div>
            ) : upcoming.data.length === 0 ? (
              <div className="mt-4 flex items-center gap-4">
                <Illo name="dhow" size={56} />
                <p className="text-body text-text-muted">{t('admin.today.noDepartures')}</p>
              </div>
            ) : (
              <>
                {/* Which departure the preview is about, and how to pick
                    another. A cascade with no named subject is a leaflet. */}
                <nav aria-label={t('admin.departures.title')} className="mt-4 flex flex-wrap gap-2">
                  {upcoming.data.map((departure) => (
                    <Link
                      key={departure.id}
                      // typedRoutes cannot see through a query string it did
                      // not generate; the path itself comes from the closed
                      // section list, which is where the safety actually is.
                      href={`${sectionHref(locale, 'bookings')}?slot=${departure.id}` as Route}
                      className={`rounded-pill border px-4 py-2 text-small ${
                        departure.id === chosen?.id
                          ? 'border-cta-edge bg-cta-fill text-text'
                          : 'border-border bg-surface text-text-muted'
                      }`}
                    >
                      <bdi>{isolate(formatDate(new Date(departure.startsAt), context, 'time'))}</bdi>
                      {' · '}
                      {departure.serviceTitle}
                    </Link>
                  ))}
                </nav>

                {preview === null ? null : !preview.ok ? (
                  <div className="mt-4">
                    <DataProblemNotice
                      problem={preview.problem}
                      t={t}
                      title={t('admin.bookings.cascadeTitle')}
                    />
                  </div>
                ) : (
                  <Cascade preview={preview.data} t={t} context={context} />
                )}
              </>
            )}
          </div>
        </section>

        {!bookings.ok ? (
          <DataProblemNotice problem={bookings.problem} t={t} title={t('admin.bookings.all')} />
        ) : (
          <Panel title={t('admin.bookings.all')} mark="pass" flush>
            <p className="flex items-start gap-2 px-6 pb-3 text-small text-text-muted">
              <Mark name="diver" size={16} className="mt-1 shrink-0" />
              {t('admin.bookings.chargeableNote')}
            </p>
            <DataTable
              columns={columns}
              rows={bookings.data}
              rowKey={(row) => row.id}
              caption={t('admin.bookings.all')}
              empty={<p className="text-body text-text-muted">{t('admin.bookings.none')}</p>}
            />
          </Panel>
        )}
      </div>
    </ConsolePage>
  );
}

const CASCADE_MARK = {
  bookings: 'pass',
  releases: 'chat',
  refunds: 'shell',
  ledger: 'weave',
  notifications: 'chat',
} as const satisfies Record<string, MarkName>;

function Cascade({
  preview,
  t,
  context,
}: {
  preview: Preview;
  t: ReturnType<typeof translator>;
  context: { locale: ReturnType<typeof resolveLocale> };
}) {
  const steps = [
    {
      kind: 'bookings' as const,
      count: preview.bookings.length,
      amountMinor: null,
      detail: preview.bookings.map((row) => row.reference),
    },
    {
      kind: 'refunds' as const,
      count: preview.refunds.length,
      amountMinor: preview.refundTotalMinor,
      detail: preview.refunds.map((row) => row.reference),
    },
    {
      kind: 'releases' as const,
      count: preview.releases.length,
      amountMinor: null,
      detail: preview.releases.map((row) => row.reference),
    },
    {
      kind: 'ledger' as const,
      count: preview.ledgerLegs,
      amountMinor: null,
      detail: ['vendorPayable', 'platformCommission', 'refundsPayable'],
    },
    {
      kind: 'notifications' as const,
      count: preview.notifications,
      amountMinor: null,
      detail: [preview.slot.vendorName],
    },
  ];

  return (
    <>
      <ol className="mt-4 flex flex-col gap-3">
        {steps.map((step) => (
          <li key={step.kind} className="flex items-start gap-4 rounded-lg bg-surface px-4 py-3">
            <Mark name={CASCADE_MARK[step.kind]} size={24} className="mt-1 shrink-0" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-body text-text">{t(`admin.cascade.${step.kind}`)}</span>
              <span className="text-small text-text-muted">{step.detail.join(' · ')}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end">
              <span className="font-display text-h3 tabular-nums text-text">
                {formatNumber(step.count, context)}
              </span>
              {step.amountMinor === null || step.amountMinor === 0 ? null : (
                <span className="text-small text-text-muted">
                  {formatCurrency(money(step.amountMinor, preview.currency), context)}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      {/*
        Why refunds can be fewer than bookings. Without this the numbers look
        like a bug, and an operator who thinks the console is buggy stops
        trusting the rest of it.
      */}
      <p className="mt-3 flex items-start gap-2 text-small text-text-muted">
        <Mark name="chat" size={16} className="mt-1 shrink-0" />
        {t('admin.cascade.releasedNote')}
      </p>

      <div className="mt-5 flex items-center gap-3">
        {/* Inert until the writes pass. A cancellation moves money and
            messages people; a button that does neither would be a lie about
            what this screen can do. */}
        <Button variant="primary" mark="wind" disabled>
          {t('admin.bookings.commit')}
        </Button>
        <Button variant="secondary" disabled>
          {t('admin.bookings.keep')}
        </Button>
      </div>
    </>
  );
}

function pickDeparture(
  departures: readonly Departure[],
  requested: string | undefined,
): Departure | null {
  const asked = departures.find((departure) => departure.id === requested);
  if (asked !== undefined) return asked;
  return (
    [...departures].sort((left, right) => right.booked - left.booked)[0] ?? null
  );
}

function partyCounts(party: Booking['party']): { chargeable: number; capacity: number } {
  let chargeable = 0;
  let capacity = 0;
  for (const [kind, total] of Object.entries(party)) {
    const rule = PARTICIPANT_RULES[kind as ParticipantKind];
    if (rule === undefined) continue;
    if (rule.chargeable) chargeable += total;
    if (rule.occupiesCapacity) capacity += total;
  }
  return { chargeable, capacity };
}
