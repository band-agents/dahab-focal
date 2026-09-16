import Link from 'next/link';
import type { Route } from 'next';

import { formatCurrency, formatDate, formatNumber, isolate, money } from '@dahab/i18n/server';

import {
  Action,
  Icon,
  Panel,
  Pill,
  RecordList,
  type IconName,
  type RecordColumn,
  type Tone,
} from '@/components/console';
import { ConsolePage, resolveLocale } from '@/components/ConsoleShell';
import { DataProblemNotice } from '@/components/DataProblemNotice';
import { OutcomeNotice } from '@/components/ReviewPanel';
import { cancelDeparture } from '@/lib/actions';
import { api, load } from '@/lib/api';
import { translator } from '@/lib/i18n';
import { sectionHref } from '@/lib/nav';

/**
 * A05 · Bookings and operations.
 *
 * The screen exists for one reason:"weather cancels boats, and cancellation
 * is a first-class, cascading operation". A status dropdown would let an
 * operator cancel a Thursday boat without ever seeing that it also opens
 * three refunds and leaves a fourth booking to be released rather than
 * refunded. So the cascade is shown BEFORE the action, computed from the same
 * rows the commit would touch, and committing it is one deliberate button.
 *
 * What the design showed and this cannot: the wind forecast that picks the
 * departure out. No weather source is connected, so nothing here claims a
 * departure is at risk. The preview instead answers"what would cancelling
 * this one do", for whichever departure is chosen — which is the part that
 * had to be true before a forecast could ever be trusted to trigger it.
 */

type Booking = Awaited<ReturnType<typeof api.admin.bookings.query>>[number];
type Departure = Awaited<ReturnType<typeof api.admin.departures.query>>[number];
type Preview = Awaited<ReturnType<typeof api.admin.cancellationPreview.query>>;
type ParticipantKind = keyof Booking['party'];

const TONE: Record<Booking['status'], Tone> = {
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
  searchParams: Promise<{ slot?: string; outcome?: string }>;
}) {
  const { locale: raw } = await params;
  const { slot: requestedSlot, outcome } = await searchParams;
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

  const columns: readonly RecordColumn<Booking>[] = [
    {
      key: 'ref',
      role: 'primary',
      header: t('admin.col4.ref'),
      width: '8rem',
      cell: (row) => <span className="font-mono text-cMeta text-c-text">{row.reference}</span>,
    },
    {
      key: 'service',
      role: 'secondary',
      header: t('admin.col.service'),
      cell: (row) => (
        <span className="block">
          <span className="block text-cLabel text-c-text">{row.serviceTitle}</span>
          <span className="block text-cMeta text-c-muted">{row.vendorName}</span>
        </span>
      ),
    },
    {
      key: 'traveler',
      role: 'column',
      header: t('admin.col4.traveler'),
      cell: (row) => row.travelerName ?? '—',
      width: '11rem',
    },
    {
      key: 'party',
      role: 'column',
      header: t('admin.col4.party'),
      width: '15rem',
      cell: (row) => {
        const counts = partyCounts(row.party);
        return (
          <span className="flex flex-col">
            <span className="text-cMeta text-c-text">
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
              <span className="text-cMeta text-c-muted">
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
      role: 'column',
      header: t('admin.col4.departs'),
      width: '12rem',
      cell: (row) => formatDate(new Date(row.startsAt), context, 'dateTime'),
    },
    {
      key: 'status',
      role: 'column',
      header: t('admin.col.status'),
      width: '14rem',
      cell: (row) => (
        <Pill tone={TONE[row.status]}>
          {t(`admin.bookingStatus.${row.status}`)}
        </Pill>
      ),
    },
    {
      key: 'total',
      role: 'end',
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
        {outcome === undefined ? null : <OutcomeNotice outcome={outcome} t={t} />}

        {/*
          Not a warning panel. The design's version was headed"wind above
          this operator's limit", and no forecast reaches this console — so
          this carries the neutral ground and says plainly that nothing is
          flagged. It turns warning-coloured on the day a weather source can
          actually flag something.
        */}
        <section className="rounded-c-md bg-c-surface">
          <header className="flex items-start gap-3 px-4 pt-5">
            <Icon name="wind" size={24} />
            <div>
              <h2 className="font-figure text-cHeading text-c-text">{t('admin.departures.title')}</h2>
              <p className="mt-1 max-w-prose text-cLabel text-c-text-muted">
                {t('admin.cond.noSource')} · {t('admin.bookings.noRisk')}
              </p>
              {chosen === null ? null : (
                <p className="mt-2 text-cMeta text-c-muted">
                  {t('admin.bookings.seats', {
                    used: formatNumber(chosen.booked, context),
                    total: formatNumber(chosen.capacity, context),
                  })}
                </p>
              )}
            </div>
          </header>

          <div className="mt-5 rounded-c-md bg-c-bg p-6">
            <h3 className="font-console text-cHeading text-c-text">{t('admin.bookings.cascadeTitle')}</h3>
            <p className="mt-1 text-cMeta text-c-muted">{t('admin.bookings.cascadeSub')}</p>

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
                <p className="text-cLabel text-c-text-muted">{t('admin.bookings.noneTomorrow')}</p>
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
                      className={`rounded-c-xs border px-4 py-2 text-cMeta ${
                        departure.id === chosen?.id
                          ? 'border-cta-edge bg-cta-fill text-c-text'
                          : 'border-c-edge bg-c-surface text-c-muted'
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
          <Panel title={t('admin.bookings.all')} flush>
            <p className="flex items-start gap-2 px-4 pb-3 text-cMeta text-c-muted">
              <Icon name="people" size={16} />
              {t('admin.bookings.chargeableNote')}
            </p>
            <RecordList
              columns={columns}
              rows={bookings.data}
              rowKey={(row) => row.id}
              caption={t('admin.bookings.all')}
              empty={<p className="text-cLabel text-c-text-muted">{t('admin.bookings.none')}</p>}
            />
          </Panel>
        )}
      </div>
    </ConsolePage>
  );
}

/**
 * One glyph per step of the cascade, so the five rows are told apart at a
 * glance rather than only by their words. Money and the ledger are
 * deliberately different marks: a refund is cash leaving, a ledger entry is
 * the record of it, and the screen is explaining that they are not the same
 * count.
 */
const CASCADE_ICON = {
  bookings: 'boat',
  releases: 'people',
  refunds: 'money',
  ledger: 'doc',
  notifications: 'doc',
} as const satisfies Record<string, IconName>;

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
          <li key={step.kind} className="flex items-start gap-4 rounded-c-sm bg-c-surface px-4 py-3">
            <Icon name={CASCADE_ICON[step.kind]} size={20} className="mt-0.5 shrink-0 text-c-muted" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-cLabel text-c-text">{t(`admin.cascade.${step.kind}`)}</span>
              <span className="text-cMeta text-c-muted">{step.detail.join(' · ')}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end">
              <span className="font-console text-cHeading tabular-nums text-c-text">
                {formatNumber(step.count, context)}
              </span>
              {step.amountMinor === null || step.amountMinor === 0 ? null : (
                <span className="text-cMeta text-c-muted">
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
      <p className="mt-3 flex items-start gap-2 text-cMeta text-c-muted">
        <Icon name="doc" size={16} />
        {t('admin.cascade.releasedNote')}
      </p>

      {/*
        The reason sits inside the same form as the commit, below the cascade
        it is a reason for. An operator types it having just read what the
        cancellation touches, which is the order that makes the sentence worth
        keeping — and the one that ends up in the audit log and in the refund.
      */}
      <form action={cancelDeparture} className="mt-5 flex flex-col gap-4">
        <input type="hidden" name="locale" value={context.locale} />
        <input type="hidden" name="slotId" value={preview.slot.id} />

        <p className="flex items-start gap-2 rounded-c-sm bg-c-warn-bg p-4 font-ui text-cMeta text-c-warn">
          <Icon name="ban" size={20} />
          {t('admin.cancelReview.warning', {
            refunds: preview.refunds.length,
            releases: preview.releases.length,
          })}
        </p>

        <label className="flex flex-col gap-2">
          <span className="font-ui text-cMeta text-c-text">{t('admin.review.reason')}</span>
          <textarea
            name="reason"
            required
            minLength={8}
            maxLength={2000}
            rows={3}
            className="w-full rounded-input border border-c-edge-strong bg-c-surface p-4 font-ui text-cLabel text-c-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
          <span className="text-cMeta text-c-muted">
            {t('admin.cancelReview.reasonHint')}
          </span>
        </label>

        <div className="flex items-center gap-3">
          <Action type="submit" intent="primary" icon="wind">
            {t('admin.bookings.commit')}
          </Action>
          <Link
            href={sectionHref(context.locale, 'bookings')}
            className="inline-flex min-h-11 items-center rounded-input px-4 font-ui text-cLabel text-c-text-link focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            {t('admin.bookings.keep')}
          </Link>
        </div>
      </form>
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
