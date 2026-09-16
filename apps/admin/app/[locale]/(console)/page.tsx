import { formatCurrency, formatDate, formatNumber, money } from '@dahab/i18n/server';

import { ConsolePage, Stack, resolveLocale } from '@/components/ConsoleShell';
import {
  Banner,
  Panel,
  Pill,
  RecordList,
  Stat,
  StatRow,
  type RecordColumn,
} from '@/components/console';
import { DataProblemNotice } from '@/components/DataProblemNotice';
import { api, load } from '@/lib/api';
import { bandFor } from '@/lib/expiry';
import { translator } from '@/lib/i18n';
import { path, sectionHref } from '@/lib/nav';

/**
 * A01 · Today.
 *
 * The one screen somebody opens before the boats go out, so every number on
 * it is counted across the whole platform rather than off the rows that
 * happen to be below it, and every panel fails on its own terms.
 *
 * Every figure here is a door. That is the change: the console used to state
 * seven numbers and leave the reader to work out which of eight sections each
 * one lived in, which is what made it read as a report rather than a place to
 * work. "3 expiring" now opens the expiry board, and a document in the panel
 * below opens the operator it belongs to — not a filtered list of documents,
 * the operator, because that is where someone can actually do something about
 * it.
 *
 * The conditions strip is deliberately absent. There is no weather provider
 * wired up, and a plausible wind speed on the screen that decides whether a
 * boat sails would be the most dangerous placeholder in the product.
 */

type Departure = Awaited<ReturnType<typeof api.admin.departures.query>>[number];
type ExpiringDocument = Awaited<ReturnType<typeof api.admin.expiring.query>>[number];
type Incident = Awaited<ReturnType<typeof api.admin.incidents.query>>[number];

/** Basis points keep the take rate off the floating-point path. */
const BASIS_POINTS = 10_000;

export default async function TodayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;
  const now = new Date();

  const [overview, departures, expiring, incidents] = await Promise.all([
    load(() => api.admin.overview.query()),
    load(() => api.admin.departures.query({ locale, dayOffset: 0 })),
    load(() => api.admin.expiring.query({ withinDays: 30 })),
    load(() => api.admin.incidents.query()),
  ]);

  // Reported this week, which is what the panel below the counters is about:
  // the record as a whole lives on the safety screen.
  const recentIncidents = incidents.ok
    ? incidents.data.filter(
        (incident) => now.getTime() - new Date(incident.occurredAt).getTime() < 7 * 86_400_000,
      )
    : [];

  const blocking = overview.ok ? overview.data.blockingExpiries : 0;

  const expiryColumns: readonly RecordColumn<ExpiringDocument>[] = [
    {
      key: 'document',
      header: t('admin.col.document'),
      role: 'primary',
      cell: (row) => t(`admin.docType.${row.type}`),
    },
    {
      key: 'vendor',
      header: t('admin.col.vendor'),
      role: 'secondary',
      cell: (row) => row.vendorName,
      width: '14rem',
    },
    {
      key: 'expires',
      header: t('admin.col.expires'),
      role: 'column',
      cell: (row) =>
        row.expiresOn === null
          ? '—'
          : formatDate(new Date(`${row.expiresOn}T00:00:00Z`), context, 'date'),
      width: '11rem',
    },
    {
      key: 'status',
      header: t('admin.col.status'),
      role: 'end',
      width: '13rem',
      cell: (row) => {
        const band = bandFor(row.expiresOn, now);
        return band === 'expired' ? (
          <Pill tone="danger" icon="ban">
            {t('admin.expiry.expired')}
          </Pill>
        ) : row.blocksPublishing ? (
          <Pill tone="warning" icon="alert">
            {t('admin.expiry.blocks')}
          </Pill>
        ) : (
          <Pill tone="neutral" icon="clock">
            {t(`admin.expiry.${band}`)}
          </Pill>
        );
      },
    },
  ];

  const departureColumns: readonly RecordColumn<Departure>[] = [
    {
      key: 'service',
      header: t('admin.col.service'),
      role: 'primary',
      cell: (row) => row.serviceTitle,
    },
    {
      key: 'when',
      header: t('admin.col.when'),
      role: 'secondary',
      cell: (row) =>
        `${formatDate(new Date(row.startsAt), context, 'time')} · ${row.vendorName}`,
      width: '13rem',
    },
    {
      key: 'site',
      header: t('admin.col.site'),
      role: 'column',
      // The sites the trip visits, in the order it visits them. A dry service
      // has none, and an em dash is the honest answer rather than a blank.
      cell: (row) =>
        row.siteNameKeys.length === 0 ? '—' : row.siteNameKeys.map((key) => t(key)).join(' · '),
    },
    {
      key: 'seats',
      header: t('admin.col.seats'),
      role: 'end',
      numeric: true,
      cell: (row) => (
        <span className={row.booked >= row.capacity ? 'text-c-bad' : undefined}>
          {formatNumber(row.booked, context)}/{formatNumber(row.capacity, context)}
        </span>
      ),
      width: '7rem',
    },
  ];

  const incidentColumns: readonly RecordColumn<Incident>[] = [
    {
      key: 'kind',
      header: t('admin.col.service'),
      role: 'primary',
      cell: (row) => t(`admin.incidentKind.${row.kind}`),
    },
    {
      key: 'where',
      header: t('admin.col.vendor'),
      role: 'secondary',
      cell: (row) =>
        row.siteSlug === null
          ? row.vendorName
          : `${row.vendorName} · ${t(siteNameKey(row.siteSlug))}`,
      width: '18rem',
    },
    {
      key: 'reference',
      header: t('admin.col.reference'),
      role: 'column',
      cell: (row) => row.reference,
      width: '10rem',
    },
    {
      key: 'severity',
      header: t('admin.col.severity'),
      role: 'end',
      width: '11rem',
      cell: (row) => (
        <Pill
          tone={row.severity === 'critical' || row.severity === 'serious' ? 'danger' : 'warning'}
          icon={row.severity === 'nearMiss' ? 'alert' : 'shield'}
        >
          {t(`admin.severity.${row.severity}`)}
        </Pill>
      ),
    },
  ];

  return (
    <ConsolePage
      locale={locale}
      current="today"
      title={t('admin.today.title')}
      subtitle={t('admin.today.subtitle')}
      {...(overview.ok
        ? { badges: { vendors: overview.data.needsAction, expiry: overview.data.expiringSoon } }
        : {})}
    >
      <Stack>
        {/*
          One banner, and only for state that is already costing somebody
          something. A blocking expiry means an operator cannot publish right
          now, which is different in kind from the counter above it.
        */}
        {blocking === 0 ? null : (
          <Banner
            tone="danger"
            icon="ban"
            title={t('admin.today.blockingTitle', { count: blocking })}
            detail={t('admin.today.blockingDetail')}
            href={sectionHref(locale, 'expiry')}
            actionLabel={t('admin.action.viewAll')}
          />
        )}

        {!overview.ok ? (
          <DataProblemNotice problem={overview.problem} t={t} title={t('admin.today.title')} />
        ) : (
          <StatRow>
            <Stat
              label={t('admin.today.departures')}
              value={formatNumber(overview.data.departuresToday, context)}
              note={t('admin.today.seats', {
                booked: formatNumber(overview.data.seatsBookedToday, context),
                total: formatNumber(overview.data.seatsCapacityToday, context),
              })}
              href={sectionHref(locale, 'bookings')}
            />
            <Stat
              label={t('admin.today.needsAction')}
              value={formatNumber(overview.data.needsAction, context)}
              href={sectionHref(locale, 'vendors')}
              {...(overview.data.needsAction > 0 ? { tone: 'warning' as const } : {})}
            />
            <Stat
              label={t('admin.today.incidents')}
              value={formatNumber(overview.data.incidentsOpen, context)}
              href={sectionHref(locale, 'trust')}
              {...(overview.data.incidentsOpen > 0 ? { tone: 'danger' as const } : {})}
            />
            <Stat
              label={t('admin.today.expiring')}
              value={formatNumber(overview.data.expiringSoon, context)}
              href={sectionHref(locale, 'expiry')}
              {...(overview.data.blockingExpiries > 0 ? { tone: 'danger' as const } : {})}
            />
            <Stat
              label={t('admin.today.revenue')}
              value={formatCurrency(
                money(overview.data.grossMinor, overview.data.currency),
                context,
              )}
              note={t('admin.today.takeRateShort', {
                rate: formatNumber(
                  overview.data.takeRateBasisPoints / BASIS_POINTS,
                  context,
                  { style: 'percent', maximumFractionDigits: 1 },
                ),
              })}
              href={sectionHref(locale, 'money')}
              wide
            />
            <Stat
              label={t('admin.today.payouts')}
              value={formatCurrency(
                money(overview.data.payoutsDueMinor, overview.data.currency),
                context,
              )}
              note={t('admin.today.payoutsCount', { count: overview.data.payoutsDueCount })}
              href={sectionHref(locale, 'money')}
              wide
            />
          </StatRow>
        )}

        {!expiring.ok ? (
          <DataProblemNotice problem={expiring.problem} t={t} title={t('admin.expiry.title')} />
        ) : (
          <Panel
            title={t('admin.expiry.title')}
            figure={formatNumber(expiring.data.length, context)}
            action={{ label: t('admin.action.viewAll'), href: sectionHref(locale, 'expiry') }}
            flush
          >
            <RecordList
              columns={expiryColumns}
              rows={expiring.data}
              rowKey={(row) => row.id}
              // The operator, not a document detail: a certificate that has
              // run out is dealt with on the operator's page, beside the
              // button that suspends them and the papers that are still good.
              href={(row) => path(locale, `vendors/${row.vendorId}`)}
              caption={t('admin.expiry.title')}
              empty={<p className="font-console text-cBody text-c-muted">{t('admin.expiryPage.none')}</p>}
            />
          </Panel>
        )}

        {!departures.ok ? (
          <DataProblemNotice
            problem={departures.problem}
            t={t}
            title={t('admin.departures.title')}
          />
        ) : (
          <Panel
            title={t('admin.departures.title')}
            figure={formatNumber(departures.data.length, context)}
            action={{ label: t('admin.action.viewAll'), href: sectionHref(locale, 'bookings') }}
            flush
          >
            <RecordList
              columns={departureColumns}
              rows={departures.data}
              rowKey={(row) => row.id}
              caption={t('admin.departures.title')}
              empty={
                <p className="font-console text-cBody text-c-muted">
                  {t('admin.today.noDepartures')}
                </p>
              }
            />
          </Panel>
        )}

        {!incidents.ok ? (
          <DataProblemNotice problem={incidents.problem} t={t} title={t('admin.today.incidents')} />
        ) : (
          <Panel
            // The record, not the counter above it: the stat counts what is
            // still open, this panel lists what was reported this week. Two
            // different questions, and giving both the same title made the
            // screen look as though it disagreed with itself.
            title={t('admin.trust.incidents')}
            figure={formatNumber(recentIncidents.length, context)}
            action={{ label: t('admin.action.viewAll'), href: sectionHref(locale, 'trust') }}
            flush
          >
            <RecordList
              columns={incidentColumns}
              rows={recentIncidents}
              rowKey={(row) => row.id}
              href={(row) => path(locale, `vendors/${row.vendorId}`)}
              caption={t('admin.today.incidents')}
              empty={
                <p className="font-console text-cBody text-c-muted">
                  {t('admin.trust.noIncidents')}
                </p>
              }
            />
          </Panel>
        )}
      </Stack>
    </ConsolePage>
  );
}

/**
 * A dive-site slug as its i18n key.
 *
 * The incident record stores where it happened as a slug rather than a
 * foreign key — an incident can happen somewhere that is not in the site
 * table — so the key is derived here rather than joined.
 */
function siteNameKey(slug: string): string {
  const camel = slug.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
  return `diveSite.${camel}`;
}
