import {
  formatCurrency,
  formatDate,
  formatDistance,
  formatTemperature,
  isolate,
  money,
} from '@dahab/i18n/server';
import { Button, DataTable, Mark, Panel, StatusPill } from '@dahab/ui-web';
import type { Column } from '@dahab/ui-web';

import { ConsolePage, resolveLocale } from '@/components/ConsoleShell';
import { CONDITIONS, COUNTERS, DEPARTURES, EXPIRING, INCIDENTS } from '@/lib/data';
import type { Departure, ExpiringDocument, Incident } from '@/lib/data';
import { translator } from '@/lib/i18n';

/** Basis points keep the take rate off the floating-point path. */
const BASIS_POINTS = 10_000;

export default async function TodayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);


  const context = { locale } as const;
  const gross = formatCurrency(
    money(COUNTERS.grossBookings.amountMinor, COUNTERS.grossBookings.currency),
    context,
  );
  const payouts = formatCurrency(
    money(COUNTERS.payoutsTotal.amountMinor, COUNTERS.payoutsTotal.currency),
    context,
  );
  const takeRate = `${(COUNTERS.takeRateBasisPoints / BASIS_POINTS) * 100}%`;

  const blocking = EXPIRING.filter((doc) => doc.blocksPublishing);

  const departureColumns: readonly Column<Departure>[] = [
    {
      key: 'when',
      header: t('admin.col.when'),
      cell: (row) => (
        <span className="flex items-center gap-3">
          <Mark name={row.mark} size={24} />
          <span className="font-display text-h3">{row.time}</span>
        </span>
      ),
      width: '9rem',
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
    { key: 'site', header: t('admin.col.site'), cell: (row) => row.site },
    {
      key: 'seats',
      header: t('admin.col.seats'),
      numeric: true,
      cell: (row) => (
        <span className={row.booked >= row.capacity ? 'text-danger-text' : undefined}>
          {row.booked}/{row.capacity}
        </span>
      ),
      width: '7rem',
    },
  ];

  const expiryColumns: readonly Column<ExpiringDocument>[] = [
    { key: 'vendor', header: t('admin.col.vendor'), cell: (row) => row.vendor, width: '14rem' },
    { key: 'document', header: t('admin.col.document'), cell: (row) => row.document },
    {
      key: 'expires',
      header: t('admin.col.expires'),
      cell: (row) => formatDate(new Date(`${row.expires}T00:00:00Z`), context, 'date'),
      width: '11rem',
    },
    {
      key: 'status',
      header: t('admin.col.status'),
      cell: (row) =>
        row.band === 'expired' ? (
          <StatusPill tone="danger" mark="sos">
            {t('admin.expiry.expired')}
          </StatusPill>
        ) : row.blocksPublishing ? (
          <StatusPill tone="warning" mark="firstAid">
            {t('admin.expiry.blocks')}
          </StatusPill>
        ) : (
          <StatusPill tone="neutral" mark="pass">
            {t(`admin.expiry.${row.band}`)}
          </StatusPill>
        ),
      width: '15rem',
    },
  ];

  const incidentColumns: readonly Column<Incident>[] = [
    { key: 'kind', header: t('admin.col.service'), cell: (row) => row.kind },
    { key: 'vendor', header: t('admin.col.vendor'), cell: (row) => row.vendor, width: '14rem' },
    { key: 'site', header: t('admin.col.site'), cell: (row) => row.site, width: '10rem' },
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
        <span className="flex items-center gap-4 rounded-pill bg-info-surface ps-4 pe-5 py-2">
          <Mark name="wind" size={20} noFlip />
          {/*
            Three discrete values, not one concatenated run. A Latin unit next
            to a digit inside an Arabic line reorders under the bidi algorithm
            — that is what threw "6 kt" to the wrong end — so each reading is
            its own element and each is isolated.
          */}
          {[
            { key: 'wind', label: t('admin.cond.windLabel'), value: t('admin.cond.wind', { value: CONDITIONS.windKt }) },
            { key: 'water', label: t('admin.cond.waterLabel'), value: formatTemperature(CONDITIONS.waterC, context) },
            { key: 'vis', label: t('admin.cond.visLabel'), value: formatDistance(CONDITIONS.visibilityM, context) },
          ].map((reading) => (
            <span key={reading.key} className="flex flex-col">
              <span className="text-caption text-text-muted">{reading.label}</span>
              <bdi className="font-display text-small text-text">{isolate(reading.value)}</bdi>
            </span>
          ))}
        </span>
      }
    >
      <div className="flex flex-col gap-8">
        <section aria-label={t('admin.today.title')} className="grid grid-cols-4 gap-4">
          <Kpi label={t('admin.today.departures')} value={String(DEPARTURES.length)} mark="sail" />
          <Kpi
            label={t('admin.today.needsAction')}
            value={String(COUNTERS.needsAction)}
            mark="chat"
          />
          <Kpi
            label={t('admin.today.incidents')}
            value={String(INCIDENTS.length)}
            mark="firstAid"
          />
          <Kpi
            label={t('admin.today.expiring')}
            value={String(EXPIRING.length)}
            mark="tank"
            tone={blocking.length > 0 ? 'danger' : 'neutral'}
          />
          <Kpi label={t('admin.today.revenue')} value={gross} mark="star" wide />
          <Kpi label={t('admin.today.takeRate')} value={takeRate} mark="compass" />
          <Kpi label={t('admin.today.payouts')} value={payouts} mark="shell" />
        </section>

        <Panel
          eyebrow={t('admin.metric.today')}
          title={t('admin.expiry.title')}
          mark="firstAid"
          flush
          action={<Button variant="ghost">{t('admin.action.viewAll')}</Button>}
        >
          <p className="px-6 pb-3 text-small text-text-muted">{t('admin.expiry.subtitle')}</p>
          <DataTable
            columns={expiryColumns}
            rows={EXPIRING}
            rowKey={(row) => row.id}
            caption={t('admin.expiry.title')}
          />
        </Panel>

        <Panel
          title={t('admin.departures.title')}
          mark="sail"
          flush
          action={<Button variant="ghost">{t('admin.action.viewAll')}</Button>}
        >
          <p className="px-6 pb-3 text-small text-text-muted">{t('admin.departures.subtitle')}</p>
          <DataTable
            columns={departureColumns}
            rows={DEPARTURES}
            rowKey={(row) => row.id}
            caption={t('admin.departures.title')}
          />
        </Panel>

        <Panel
          title={t('admin.today.incidents')}
          mark="chamber"
          flush
          action={<Button variant="ghost">{t('admin.action.viewAll')}</Button>}
        >
          <DataTable
            columns={incidentColumns}
            rows={INCIDENTS}
            rowKey={(row) => row.id}
            caption={t('admin.today.incidents')}
          />
        </Panel>
      </div>
    </ConsolePage>
  );
}

function Kpi({
  label,
  value,
  mark,
  tone = 'neutral',
  wide = false,
}: {
  label: string;
  value: string;
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
    </div>
  );
}
