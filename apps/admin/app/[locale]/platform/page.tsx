import { LOCALE_DESCRIPTORS, formatDate, formatDepth, formatNumber } from '@dahab/i18n/server';
import { DataTable, Mark, Panel, StatusPill } from '@dahab/ui-web';
import type { Column } from '@dahab/ui-web';

import { ConsolePage, resolveLocale } from '@/components/ConsoleShell';
import { translator } from '@/lib/i18n';
import { AUDIT, FLAGS, SITES, TRANSLATIONS } from '@/lib/platform';
import type { AuditRecord, DiveSite, FeatureFlag, TranslationCoverage } from '@/lib/platform';

/**
 * A08 · Platform.
 *
 * The audit log leads, because it is the counterweight to the admin role
 * holding every permission except the two that only make sense for a vendor
 * acting on its own record. Each row names the permission exercised rather
 * than the button pressed, and carries the reason the actor gave — which is
 * what makes `user.impersonate` and `vendor.verify` accountable rather than
 * merely available.
 */

export default async function PlatformPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;

  const auditColumns: readonly Column<AuditRecord>[] = [
    {
      key: 'at',
      header: t('admin.col5.when'),
      cell: (row) => formatDate(new Date(row.at), context, 'dateTime'),
      width: '13rem',
    },
    { key: 'actor', header: t('admin.col5.actor'), cell: (row) => row.actor, width: '13rem' },
    {
      key: 'permission',
      header: t('admin.col5.permission'),
      width: '13rem',
      // The permission, not the button: a screen may need several, and a
      // permission is never named after a control.
      cell: (row) => <span className="font-mono text-small text-text">{row.permission}</span>,
    },
    { key: 'target', header: t('admin.col5.target'), cell: (row) => row.target, width: '16rem' },
    {
      key: 'reason',
      header: t('admin.col5.reason'),
      cell: (row) => <span className="text-small text-text-muted">{row.reason}</span>,
    },
  ];

  const flagColumns: readonly Column<FeatureFlag>[] = [
    {
      key: 'key',
      header: t('admin.col5.flag'),
      cell: (row) => <span className="font-mono text-small text-text">{row.key}</span>,
      width: '20rem',
    },
    { key: 'gates', header: t('admin.col5.gates'), cell: (row) => row.gates },
    { key: 'rollout', header: t('admin.col5.rollout'), cell: (row) => row.rollout, width: '14rem' },
    {
      key: 'on',
      header: t('admin.col.status'),
      width: '9rem',
      cell: (row) => (
        <StatusPill tone={row.on ? 'success' : 'neutral'} mark={row.on ? 'eco' : 'pass'}>
          {row.on ? t('admin.platform.on') : t('admin.platform.off')}
        </StatusPill>
      ),
    },
  ];

  const siteColumns: readonly Column<DiveSite>[] = [
    { key: 'name', header: t('admin.col5.site'), cell: (row) => row.name, width: '13rem' },
    {
      key: 'depth',
      header: t('admin.col5.depth'),
      numeric: true,
      width: '8rem',
      cell: (row) => formatDepth(row.depthM, context),
    },
    {
      key: 'difficulty',
      header: t('admin.col5.difficulty'),
      width: '11rem',
      cell: (row) => (
        <StatusPill
          tone={row.difficulty === 'technical' ? 'danger' : row.difficulty === 'advanced' ? 'warning' : 'neutral'}
          mark={row.difficulty === 'technical' ? 'sos' : 'depth'}
        >
          {t(`admin.difficulty.${row.difficulty}`)}
        </StatusPill>
      ),
    },
    {
      key: 'entry',
      header: t('admin.col5.entryType'),
      cell: (row) => t(`admin.entry.${row.entry}`),
      width: '11rem',
    },
    {
      key: 'hazard',
      header: t('admin.col5.hazard'),
      cell: (row) =>
        row.hazard === null ? (
          <span className="text-text-muted">—</span>
        ) : (
          <span className="text-small text-text">{row.hazard}</span>
        ),
    },
  ];

  const translationColumns: readonly Column<TranslationCoverage>[] = [
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
      key: 'needsReview',
      header: t('admin.col5.needsReview'),
      numeric: true,
      width: '11rem',
      cell: (row) =>
        row.needsReview === 0 ? '—' : (
          <span className="text-warning-text">{formatNumber(row.needsReview, context)}</span>
        ),
    },
    {
      key: 'missing',
      header: t('admin.col5.missing'),
      numeric: true,
      width: '9rem',
      cell: (row) =>
        row.missing === 0 ? '—' : (
          <span className="text-danger-text">{formatNumber(row.missing, context)}</span>
        ),
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
        <Panel title={t('admin.platform.audit')} mark="weave" flush>
          <p className="flex items-start gap-2 px-6 pb-3 text-small text-text-muted">
            <Mark name="compass" size={16} noFlip className="mt-1 shrink-0" />
            {t('admin.platform.auditSub')}
          </p>
          <DataTable
            columns={auditColumns}
            rows={AUDIT}
            rowKey={(row) => row.id}
            caption={t('admin.platform.audit')}
          />
        </Panel>

        <Panel title={t('admin.platform.translations')} mark="chat" flush>
          <p className="px-6 pb-3 text-small text-text-muted">{t('admin.platform.translationsSub')}</p>
          <DataTable
            columns={translationColumns}
            rows={TRANSLATIONS}
            rowKey={(row) => row.locale}
            density="compact"
            caption={t('admin.platform.translations')}
          />
        </Panel>

        <Panel title={t('admin.platform.flags')} mark="pass" flush>
          <DataTable
            columns={flagColumns}
            rows={FLAGS}
            rowKey={(row) => row.key}
            density="compact"
            caption={t('admin.platform.flags')}
          />
        </Panel>

        <Panel title={t('admin.platform.sites')} mark="depth" flush>
          <DataTable
            columns={siteColumns}
            rows={SITES}
            rowKey={(row) => row.name}
            density="compact"
            caption={t('admin.platform.sites')}
          />
        </Panel>
      </div>
    </ConsolePage>
  );
}
