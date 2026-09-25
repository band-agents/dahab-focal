import { LOCALE_DESCRIPTORS, formatDate, formatDepth, formatNumber } from '@dahab/i18n/server';

import {
  Icon,
  Panel,
  Pill,
  RecordList,
  type RecordColumn,
} from '@/components/console';
import { ConsolePage, resolveLocale } from '@/components/ConsoleShell';
import { DataProblemNotice } from '@/components/DataProblemNotice';
import { api, load } from '@/lib/api';
import { translator } from '@/lib/i18n';

/**
 * A08 · Platform.
 *
 * The audit log leads, because it is the counterweight to the admin role
 * holding every permission except the two that only make sense for a vendor
 * acting on its own record. Each row names the action taken rather than the
 * button pressed, and carries the reason the actor gave — which is what makes
 * `user.impersonate` and `vendor.verify` accountable rather than merely
 * available.
 *
 * It is empty at the time of writing, and says so. The console has no writes
 * yet, so nothing has passed through it; an audit log that looked populated
 * before anything had happened would be the one lie this screen cannot
 * afford.
 */

type AuditRecord = Awaited<ReturnType<typeof api.admin.audit.query>>[number];
type FeatureFlag = Awaited<ReturnType<typeof api.admin.featureFlags.query>>[number];
type DiveSite = Awaited<ReturnType<typeof api.admin.diveSites.query>>[number];
type Coverage = Awaited<ReturnType<typeof api.admin.translationCoverage.query>>[number];

export default async function PlatformPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;

  const [audit, coverage, flags, sites] = await Promise.all([
    load(() => api.admin.audit.query({ limit: 50 })),
    load(() => api.admin.translationCoverage.query()),
    load(() => api.admin.featureFlags.query()),
    load(() => api.admin.diveSites.query()),
  ]);

  const auditColumns: readonly RecordColumn<AuditRecord>[] = [
    {
      key: 'at',
      role: 'primary',
      header: t('admin.col5.when'),
      cell: (row) => formatDate(new Date(row.at), context, 'dateTime'),
      width: '13rem',
    },
    {
      key: 'actor',
      role: 'secondary',
      header: t('admin.col5.actor'),
      cell: (row) => row.actor ?? '—',
      width: '13rem',
    },
    {
      key: 'action',
      role: 'column',
      header: t('admin.col5.permission'),
      width: '13rem',
      // The action, not the button: a screen may need several, and neither an
      // action nor a permission is ever named after a control.
      cell: (row) => <span className="font-mono text-cMeta text-c-text">{row.action}</span>,
    },
    {
      key: 'target',
      role: 'column',
      header: t('admin.col5.target'),
      cell: (row) => <span className="font-mono text-cMeta text-c-muted">{row.entity}</span>,
      width: '18rem',
    },
    {
      key: 'reason',
      role: 'end',
      header: t('admin.col5.reason'),
      cell: (row) => <span className="text-cMeta text-c-muted">{row.reason ?? '—'}</span>,
    },
  ];

  const flagColumns: readonly RecordColumn<FeatureFlag>[] = [
    {
      key: 'key',
      role: 'primary',
      header: t('admin.col5.flag'),
      cell: (row) => <span className="font-mono text-cMeta text-c-text">{row.key}</span>,
      width: '20rem',
    },
    {
      key: 'gates',
      role: 'secondary',
      header: t('admin.col5.gates'),
      cell: (row) => row.description,
    },
    {
      key: 'rollout',
      role: 'column',
      header: t('admin.col5.rollout'),
      numeric: true,
      width: '10rem',
      // The dial's actual position. A flag that is"on" at 25% is on for a
      // quarter of travellers, and the word alone would hide that.
      cell: (row) =>
        formatNumber(row.rolloutPercentage / 100, context, { style: 'percent' }),
    },
    {
      key: 'on',
      role: 'column',
      header: t('admin.col.status'),
      width: '9rem',
      cell: (row) => (
        <Pill tone={row.isEnabled ? 'success' : 'neutral'}>
          {row.isEnabled ? t('admin.platform.on') : t('admin.platform.off')}
        </Pill>
      ),
    },
  ];

  const siteColumns: readonly RecordColumn<DiveSite>[] = [
    {
      key: 'name',
      role: 'primary',
      header: t('admin.col5.site'),
      // The site's own i18n key, resolved here. Place names are data in the
      // database and translations in the catalogue, never a literal in a page.
      cell: (row) => t(row.nameKey),
      width: '13rem',
    },
    {
      key: 'depth',
      role: 'secondary',
      header: t('admin.col5.depth'),
      numeric: true,
      width: '8rem',
      cell: (row) =>
        row.maxDepthMetres === null ? '—' : formatDepth(row.maxDepthMetres, context),
    },
    {
      key: 'difficulty',
      role: 'column',
      header: t('admin.col5.difficulty'),
      width: '11rem',
      cell: (row) => (
        <Pill
          tone={
            row.difficulty === 'technical'
              ? 'danger'
              : row.difficulty === 'advanced'
                ? 'warning'
                : 'neutral'
          }
        >
          {t(`admin.difficulty.${row.difficulty}`)}
        </Pill>
      ),
    },
    {
      key: 'entry',
      role: 'column',
      header: t('admin.col5.entryType'),
      cell: (row) => t(`admin.entry.${row.entryType}`),
      width: '11rem',
    },
    {
      key: 'hazard',
      role: 'end',
      header: t('admin.col5.hazard'),
      cell: (row) =>
        row.hazards.length === 0 ? (
          <span className="text-c-muted">—</span>
        ) : (
          <span className="text-cMeta text-c-text">{row.hazards.join(' · ')}</span>
        ),
    },
  ];

  const translationColumns: readonly RecordColumn<Coverage>[] = [
    {
      key: 'locale',
      role: 'primary',
      header: t('admin.col5.locale'),
      width: '14rem',
      cell: (row) => (
        <span className="flex items-center gap-2">
          <span className="text-cLabel text-c-text">{LOCALE_DESCRIPTORS[row.locale].endonym}</span>
          <span className="font-figure text-cFigureSm text-c-muted">{row.locale}</span>
        </span>
      ),
    },
    {
      key: 'human',
      role: 'secondary',
      header: t('admin.col5.human'),
      numeric: true,
      cell: (row) => formatNumber(row.human, context),
      width: '8rem',
    },
    {
      key: 'machine',
      role: 'column',
      header: t('admin.col5.machine'),
      numeric: true,
      cell: (row) => formatNumber(row.machine, context),
      width: '8rem',
    },
    {
      key: 'missing',
      role: 'column',
      header: t('admin.col5.missing'),
      numeric: true,
      width: '9rem',
      // Missing is the number that decides whether a listing can be shown in
      // a language at all, so it is the one carrying the danger colour.
      cell: (row) =>
        row.missing === 0 ? (
          '—'
        ) : (
          <span className="text-c-bad">{formatNumber(row.missing, context)}</span>
        ),
    },
    {
      key: 'reviews',
      role: 'end',
      header: t('admin.col5.reviews'),
      numeric: true,
      cell: (row) => formatNumber(row.reviews, context),
      width: '9rem',
    },
  ];

  return (
    <ConsolePage
      locale={locale}
      current="platform"
      title={t('admin.platform.title')}
      subtitle={t('admin.platform.subtitle')}
    >
      <div className="flex flex-col gap-8">
        {!audit.ok ? (
          <DataProblemNotice problem={audit.problem} t={t} title={t('admin.platform.audit')} />
        ) : (
          <Panel title={t('admin.platform.audit')} flush>
            <p className="flex items-start gap-2 px-4 pb-3 text-cMeta text-c-muted">
              <Icon name="operators" size={16} />
              {t('admin.platform.auditSub')}
            </p>
            {audit.data.length === 0 ? (
              <div className="flex items-center gap-4 px-4 pb-6">
                <p className="max-w-prose text-cLabel text-c-text-muted">
                  {t('admin.platform.noAudit')}
                </p>
              </div>
            ) : (
              <RecordList
                columns={auditColumns}
                rows={audit.data}
                rowKey={(row) => row.id}
                caption={t('admin.platform.audit')}
              />
            )}
          </Panel>
        )}

        {!coverage.ok ? (
          <DataProblemNotice
            problem={coverage.problem}
            t={t}
            title={t('admin.platform.translations')}
          />
        ) : (
          <Panel title={t('admin.platform.translations')} flush>
            <p className="px-4 pb-2 pt-3 text-cMeta text-c-muted">
              {t('admin.platform.translationsSub')}
            </p>
            <RecordList
              columns={translationColumns}
              rows={coverage.data}
              rowKey={(row) => row.locale}
              caption={t('admin.platform.translations')}
            />
          </Panel>
        )}

        {!flags.ok ? (
          <DataProblemNotice problem={flags.problem} t={t} title={t('admin.platform.flags')} />
        ) : (
          <Panel title={t('admin.platform.flags')} flush>
            <p className="px-4 pb-2 pt-3 text-cMeta text-c-muted">{t('admin.platform.flagsSub')}</p>
            <RecordList
              columns={flagColumns}
              rows={flags.data}
              rowKey={(row) => row.key}
              caption={t('admin.platform.flags')}
            />
          </Panel>
        )}

        {!sites.ok ? (
          <DataProblemNotice problem={sites.problem} t={t} title={t('admin.platform.sites')} />
        ) : (
          <Panel title={t('admin.platform.sites')} flush>
            <p className="px-4 pb-2 pt-3 text-cMeta text-c-muted">{t('admin.platform.sitesSub')}</p>
            <RecordList
              columns={siteColumns}
              rows={sites.data}
              rowKey={(row) => row.slug}
              caption={t('admin.platform.sites')}
            />
          </Panel>
        )}
      </div>
    </ConsolePage>
  );
}
