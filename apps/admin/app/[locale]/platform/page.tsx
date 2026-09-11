import { LOCALE_DESCRIPTORS, formatDate, formatDepth, formatNumber } from '@dahab/i18n/server';
import { DataTable, Illo, Mark, Panel, StatusPill } from '@dahab/ui-web';
import type { Column } from '@dahab/ui-web';

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

  const auditColumns: readonly Column<AuditRecord>[] = [
    {
      key: 'at',
      header: t('admin.col5.when'),
      cell: (row) => formatDate(new Date(row.at), context, 'dateTime'),
      width: '13rem',
    },
    {
      key: 'actor',
      header: t('admin.col5.actor'),
      cell: (row) => row.actor ?? '—',
      width: '13rem',
    },
    {
      key: 'action',
      header: t('admin.col5.permission'),
      width: '13rem',
      // The action, not the button: a screen may need several, and neither an
      // action nor a permission is ever named after a control.
      cell: (row) => <span className="font-mono text-small text-text">{row.action}</span>,
    },
    {
      key: 'target',
      header: t('admin.col5.target'),
      cell: (row) => <span className="font-mono text-small text-text-muted">{row.entity}</span>,
      width: '18rem',
    },
    {
      key: 'reason',
      header: t('admin.col5.reason'),
      cell: (row) => <span className="text-small text-text-muted">{row.reason ?? '—'}</span>,
    },
  ];

  const flagColumns: readonly Column<FeatureFlag>[] = [
    {
      key: 'key',
      header: t('admin.col5.flag'),
      cell: (row) => <span className="font-mono text-small text-text">{row.key}</span>,
      width: '20rem',
    },
    { key: 'gates', header: t('admin.col5.gates'), cell: (row) => row.description },
    {
      key: 'rollout',
      header: t('admin.col5.rollout'),
      numeric: true,
      width: '10rem',
      // The dial's actual position. A flag that is "on" at 25% is on for a
      // quarter of travellers, and the word alone would hide that.
      cell: (row) =>
        formatNumber(row.rolloutPercentage / 100, context, { style: 'percent' }),
    },
    {
      key: 'on',
      header: t('admin.col.status'),
      width: '9rem',
      cell: (row) => (
        <StatusPill tone={row.isEnabled ? 'success' : 'neutral'} mark={row.isEnabled ? 'eco' : 'pass'}>
          {row.isEnabled ? t('admin.platform.on') : t('admin.platform.off')}
        </StatusPill>
      ),
    },
  ];

  const siteColumns: readonly Column<DiveSite>[] = [
    {
      key: 'name',
      header: t('admin.col5.site'),
      // The site's own i18n key, resolved here. Place names are data in the
      // database and translations in the catalogue, never a literal in a page.
      cell: (row) => t(row.nameKey),
      width: '13rem',
    },
    {
      key: 'depth',
      header: t('admin.col5.depth'),
      numeric: true,
      width: '8rem',
      cell: (row) =>
        row.maxDepthMetres === null ? '—' : formatDepth(row.maxDepthMetres, context),
    },
    {
      key: 'difficulty',
      header: t('admin.col5.difficulty'),
      width: '11rem',
      cell: (row) => (
        <StatusPill
          tone={
            row.difficulty === 'technical'
              ? 'danger'
              : row.difficulty === 'advanced'
                ? 'warning'
                : 'neutral'
          }
          mark={row.difficulty === 'technical' ? 'sos' : 'depth'}
        >
          {t(`admin.difficulty.${row.difficulty}`)}
        </StatusPill>
      ),
    },
    {
      key: 'entry',
      header: t('admin.col5.entryType'),
      cell: (row) => t(`admin.entry.${row.entryType}`),
      width: '11rem',
    },
    {
      key: 'hazard',
      header: t('admin.col5.hazard'),
      cell: (row) =>
        row.hazards.length === 0 ? (
          <span className="text-text-muted">—</span>
        ) : (
          <span className="text-small text-text">{row.hazards.join(' · ')}</span>
        ),
    },
  ];

  const translationColumns: readonly Column<Coverage>[] = [
    {
      key: 'locale',
      header: t('admin.col5.locale'),
      width: '14rem',
      cell: (row) => (
        <span className="flex items-center gap-2">
          <span className="text-body text-text">{LOCALE_DESCRIPTORS[row.locale].endonym}</span>
          <span className="font-mono text-caption text-text-muted">{row.locale}</span>
        </span>
      ),
    },
    {
      key: 'human',
      header: t('admin.col5.human'),
      numeric: true,
      cell: (row) => formatNumber(row.human, context),
      width: '8rem',
    },
    {
      key: 'machine',
      header: t('admin.col5.machine'),
      numeric: true,
      cell: (row) => formatNumber(row.machine, context),
      width: '8rem',
    },
    {
      key: 'missing',
      header: t('admin.col5.missing'),
      numeric: true,
      width: '9rem',
      // Missing is the number that decides whether a listing can be shown in
      // a language at all, so it is the one carrying the danger colour.
      cell: (row) =>
        row.missing === 0 ? (
          '—'
        ) : (
          <span className="text-danger-text">{formatNumber(row.missing, context)}</span>
        ),
    },
    {
      key: 'reviews',
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
          <Panel title={t('admin.platform.audit')} mark="weave" flush>
            <p className="flex items-start gap-2 px-6 pb-3 text-small text-text-muted">
              <Mark name="compass" size={16} noFlip className="mt-1 shrink-0" />
              {t('admin.platform.auditSub')}
            </p>
            {audit.data.length === 0 ? (
              <div className="flex items-center gap-4 px-6 pb-6">
                <Illo name="seaTurtle" size={56} />
                <p className="max-w-prose text-body text-text-muted">
                  {t('admin.platform.noAudit')}
                </p>
              </div>
            ) : (
              <DataTable
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
          <Panel title={t('admin.platform.translations')} mark="chat" flush>
            <p className="px-6 pb-3 text-small text-text-muted">
              {t('admin.platform.translationsSub')}
            </p>
            <DataTable
              columns={translationColumns}
              rows={coverage.data}
              rowKey={(row) => row.locale}
              density="compact"
              caption={t('admin.platform.translations')}
            />
          </Panel>
        )}

        {!flags.ok ? (
          <DataProblemNotice problem={flags.problem} t={t} title={t('admin.platform.flags')} />
        ) : (
          <Panel title={t('admin.platform.flags')} mark="pass" flush>
            <p className="px-6 pb-3 text-small text-text-muted">{t('admin.platform.flagsSub')}</p>
            <DataTable
              columns={flagColumns}
              rows={flags.data}
              rowKey={(row) => row.key}
              density="compact"
              caption={t('admin.platform.flags')}
            />
          </Panel>
        )}

        {!sites.ok ? (
          <DataProblemNotice problem={sites.problem} t={t} title={t('admin.platform.sites')} />
        ) : (
          <Panel title={t('admin.platform.sites')} mark="depth" flush>
            <p className="px-6 pb-3 text-small text-text-muted">{t('admin.platform.sitesSub')}</p>
            <DataTable
              columns={siteColumns}
              rows={sites.data}
              rowKey={(row) => row.slug}
              density="compact"
              caption={t('admin.platform.sites')}
            />
          </Panel>
        )}
      </div>
    </ConsolePage>
  );
}
