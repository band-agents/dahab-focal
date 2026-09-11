import Link from 'next/link';

import { formatCurrency, formatDate, formatNumber, money } from '@dahab/i18n/server';
import { DataTable, Illo, Mark, Panel, StatusPill } from '@dahab/ui-web';
import type { Column } from '@dahab/ui-web';

import { CategoryGlyph } from '@/components/CategoryGlyph';
import { ConsolePage, resolveLocale } from '@/components/ConsoleShell';
import { DataProblemNotice } from '@/components/DataProblemNotice';
import { api, load } from '@/lib/api';
import { bandFor } from '@/lib/expiry';
import { translator } from '@/lib/i18n';
import { sectionHref } from '@/lib/nav';

/**
 * A01 · Today.
 *
 * The one screen somebody opens before the boats go out, so every number on
 * it is counted across the whole platform rather than off the rows that
 * happen to be below it, and every panel fails on its own terms.
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

  const departureColumns: readonly Column<Departure>[] = [
    {
      key: 'when',
      header: t('admin.col.when'),
      cell: (row) => (
        <span className="flex items-center gap-3">
          <CategoryGlyph slug={row.categorySlug} />
          <span className="font-display text-h3">
            {formatDate(new Date(row.startsAt), context, 'time')}
          </span>
        </span>
      ),
      width: '10rem',
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
      key: 'site',
      header: t('admin.col.site'),
      // The sites the trip visits, in the order it visits them. A dry service
      // has none, and an em dash is the honest answer rather than a blank.
      cell: (row) =>
        row.siteNameKeys.length === 0
          ? '—'
          : row.siteNameKeys.map((key) => t(key)).join(' · '),
    },
    {
      key: 'seats',
      header: t('admin.col.seats'),
      numeric: true,
      cell: (row) => (
        <span className={row.booked >= row.capacity ? 'text-danger-text' : undefined}>
          {formatNumber(row.booked, context)}/{formatNumber(row.capacity, context)}
        </span>
      ),
      width: '7rem',
    },
  ];

  const expiryColumns: readonly Column<ExpiringDocument>[] = [
    { key: 'vendor', header: t('admin.col.vendor'), cell: (row) => row.vendorName, width: '14rem' },
    {
      key: 'document',
      header: t('admin.col.document'),
      cell: (row) => t(`admin.docType.${row.type}`),
    },
    {
      key: 'expires',
      header: t('admin.col.expires'),
      cell: (row) =>
        row.expiresOn === null
          ? '—'
          : formatDate(new Date(`${row.expiresOn}T00:00:00Z`), context, 'date'),
      width: '11rem',
    },
    {
      key: 'status',
      header: t('admin.col.status'),
      width: '15rem',
      cell: (row) => {
        const band = bandFor(row.expiresOn, now);
        return band === 'expired' ? (
          <StatusPill tone="danger" mark="sos">
            {t('admin.expiry.expired')}
          </StatusPill>
        ) : row.blocksPublishing ? (
          <StatusPill tone="warning" mark="firstAid">
            {t('admin.expiry.blocks')}
          </StatusPill>
        ) : (
          <StatusPill tone="neutral" mark="pass">
            {t(`admin.expiry.${band}`)}
          </StatusPill>
        );
      },
    },
  ];

  const incidentColumns: readonly Column<Incident>[] = [
    {
      key: 'kind',
      header: t('admin.col.service'),
      cell: (row) => (
        <span className="block">
          <span className="block text-body text-text">{t(`admin.incidentKind.${row.kind}`)}</span>
          <span className="block font-mono text-caption text-text-muted">{row.reference}</span>
        </span>
      ),
    },
    { key: 'vendor', header: t('admin.col.vendor'), cell: (row) => row.vendorName, width: '14rem' },
    {
      key: 'site',
      header: t('admin.col.site'),
      cell: (row) => (row.siteSlug === null ? '—' : t(siteNameKey(row.siteSlug))),
      width: '12rem',
    },
    {
      key: 'severity',
      header: t('admin.col.severity'),
      width: '11rem',
      cell: (row) => (
        <StatusPill
          tone={row.severity === 'critical' || row.severity === 'serious' ? 'danger' : 'warning'}
          mark={row.severity === 'nearMiss' ? 'eco' : 'firstAid'}
        >
          {t(`admin.severity.${row.severity}`)}
        </StatusPill>
      ),
    },
  ];

  return (
    <ConsolePage
      locale={locale}
      current="today"
      title={t('admin.today.title')}
      subtitle={t('admin.today.subtitle')}
      headerEnd={
        // No weather provider is connected, so the strip says that rather
        // than showing a reading nobody measured.
        <span className="flex items-center gap-3 rounded-pill bg-info-surface ps-4 pe-5 py-2">
          <Mark name="offline" size={20} noFlip />
          <span className="flex flex-col">
            <span className="text-caption text-text-muted">{t('admin.today.weather')}</span>
            <span className="text-small text-text">{t('admin.cond.noSource')}</span>
          </span>
        </span>
      }
    >
      <div className="flex flex-col gap-8">
        {!overview.ok ? (
          <DataProblemNotice problem={overview.problem} t={t} title={t('admin.today.title')} />
        ) : (
          <section aria-label={t('admin.today.title')} className="grid grid-cols-4 gap-4">
            <Kpi
              label={t('admin.today.departures')}
              value={formatNumber(overview.data.departuresToday, context)}
              note={t('admin.today.seats', {
                booked: formatNumber(overview.data.seatsBookedToday, context),
                total: formatNumber(overview.data.seatsCapacityToday, context),
              })}
              mark="sail"
            />
            <Kpi
              label={t('admin.today.needsAction')}
              value={formatNumber(overview.data.needsAction, context)}
              mark="chat"
            />
            <Kpi
              label={t('admin.today.incidents')}
              value={formatNumber(overview.data.incidentsOpen, context)}
              mark="firstAid"
            />
            <Kpi
              label={t('admin.today.expiring')}
              value={formatNumber(overview.data.expiringSoon, context)}
              mark="tank"
              tone={overview.data.blockingExpiries > 0 ? 'danger' : 'neutral'}
            />
            <Kpi
              label={t('admin.today.revenue')}
              value={formatCurrency(
                money(overview.data.grossMinor, overview.data.currency),
                context,
              )}
              mark="star"
              wide
            />
            <Kpi
              label={t('admin.today.takeRate')}
              value={formatNumber(overview.data.takeRateBasisPoints / BASIS_POINTS, context, {
                style: 'percent',
                maximumFractionDigits: 1,
              })}
              mark="compass"
            />
            <Kpi
              label={t('admin.today.payouts')}
              value={formatCurrency(
                money(overview.data.payoutsDueMinor, overview.data.currency),
                context,
              )}
              note={formatNumber(overview.data.payoutsDueCount, context)}
              mark="shell"
            />
          </section>
        )}

        {!expiring.ok ? (
          <DataProblemNotice problem={expiring.problem} t={t} title={t('admin.expiry.title')} />
        ) : (
          <Panel
            eyebrow={t('admin.expiry.count', { count: expiring.data.length })}
            title={t('admin.expiry.title')}
            mark="firstAid"
            flush
            action={
              <Link
                href={sectionHref(locale, 'expiry')}
                className="rounded-pill px-4 py-2 text-small text-text-link underline-offset-4 hover:underline"
              >
                {t('admin.action.viewAll')}
              </Link>
            }
          >
            <p className="px-6 pb-3 text-small text-text-muted">{t('admin.expiry.subtitle')}</p>
            <DataTable
              columns={expiryColumns}
              rows={expiring.data}
              rowKey={(row) => row.id}
              caption={t('admin.expiry.title')}
              empty={<p className="text-body text-text-muted">{t('admin.expiryPage.none')}</p>}
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
          <Panel title={t('admin.departures.title')} mark="sail" flush>
            <p className="px-6 pb-3 text-small text-text-muted">{t('admin.departures.subtitle')}</p>
            {departures.data.length === 0 ? (
              <div className="flex items-center gap-4 px-6 pb-6">
                <Illo name="dhow" size={56} />
                <p className="text-body text-text-muted">{t('admin.today.noDepartures')}</p>
              </div>
            ) : (
              <DataTable
                columns={departureColumns}
                rows={departures.data}
                rowKey={(row) => row.id}
                caption={t('admin.departures.title')}
              />
            )}
          </Panel>
        )}

        {!incidents.ok ? (
          <DataProblemNotice problem={incidents.problem} t={t} title={t('admin.today.incidents')} />
        ) : (
          <Panel
            eyebrow={t('admin.today.incidentsRecent')}
            // The record, not the counter above it: the KPI counts what is
            // still open, this panel lists what was reported. Two different
            // questions, and giving both the same title made the screen look
            // as though it disagreed with itself.
            title={t('admin.trust.incidents')}
            mark="chamber"
            flush
            action={
              <Link
                href={sectionHref(locale, 'trust')}
                className="rounded-pill px-4 py-2 text-small text-text-link underline-offset-4 hover:underline"
              >
                {t('admin.action.viewAll')}
              </Link>
            }
          >
            {recentIncidents.length === 0 ? (
              <div className="flex items-center gap-4 px-6 pb-6 pt-2">
                <Illo name="seaTurtle" size={56} />
                <p className="text-body text-text-muted">{t('admin.trust.noIncidents')}</p>
              </div>
            ) : (
              <DataTable
                columns={incidentColumns}
                rows={recentIncidents}
                rowKey={(row) => row.id}
                caption={t('admin.today.incidents')}
              />
            )}
          </Panel>
        )}
      </div>
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

function Kpi({
  label,
  value,
  note,
  mark,
  tone = 'neutral',
  wide = false,
}: {
  label: string;
  value: string;
  note?: string;
  mark: Parameters<typeof Mark>[0]['name'];
  tone?: 'neutral' | 'danger';
  wide?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl bg-surface px-5 py-4 shadow-sm ${
        wide ? 'col-span-2' : ''
      }`}
    >
      <span className="flex items-center gap-2 text-overline uppercase text-text-muted">
        <Mark name={mark} size={20} />
        {label}
      </span>
      <span
        className={`font-display text-displayL tabular-nums ${
          tone === 'danger' ? 'text-danger-text' : 'text-text'
        }`}
      >
        {value}
      </span>
      {note === undefined ? null : (
        <span className="text-small text-text-muted tabular-nums">{note}</span>
      )}
    </div>
  );
}
