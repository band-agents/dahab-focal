import { formatDate, formatNumber } from '@dahab/i18n/server';
import { Button, DataTable, Mark, Panel, StatusPill } from '@dahab/ui-web';
import type { Column, StatusTone } from '@dahab/ui-web';

import { ConsolePage, resolveLocale } from '@/components/ConsoleShell';
import { translator } from '@/lib/i18n';
import { ATTRIBUTES, CATEGORY_SUMMARY, COMPARISON_GROUPS, SERVICE_QUEUE } from '@/lib/taxonomy';
import type { AttributeDefinition, CategorySummary, ServiceReview, ServiceStatus } from '@/lib/taxonomy';

/**
 * A04 · Catalogue and taxonomy.
 *
 * The most consequential screen in the console, because it is where the
 * product's central bet is either kept or quietly broken: comparable
 * attributes are DATA. Every row in the attributes table is a row in
 * `attribute_definitions`, read by three surfaces — this manager, the vendor
 * service builder and the traveler comparison engine.
 *
 * So the screen shows the blast radius rather than hiding it: how many
 * services carry a value for each attribute, which normalisation puts two
 * different answers on one axis, and which attributes are descriptive only and
 * therefore never reach a comparison table.
 */

const SERVICE_TONE: Record<ServiceStatus, StatusTone> = {
  draft: 'neutral',
  underReview: 'warning',
  published: 'success',
  paused: 'info',
  archived: 'neutral',
  rejected: 'danger',
};

export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;

  const byGroup = COMPARISON_GROUPS.map((group) => ({
    group,
    rows: ATTRIBUTES.filter((attribute) => attribute.comparisonGroup === group),
  })).filter((entry) => entry.rows.length > 0);

  const descriptive = ATTRIBUTES.filter((attribute) => !attribute.isComparable);

  const queueColumns: readonly Column<ServiceReview>[] = [
    {
      key: 'title',
      header: t('admin.col.service'),
      cell: (row) => (
        <span className="block">
          <span className="block text-body text-text">{row.title}</span>
          <span className="block text-small text-text-muted">{row.vendor}</span>
        </span>
      ),
    },
    {
      key: 'category',
      header: t('admin.col3.category'),
      cell: (row) => row.categorySlug,
      width: '9rem',
    },
    {
      key: 'submitted',
      header: t('admin.col3.submitted'),
      cell: (row) => formatDate(new Date(`${row.submitted}T00:00:00Z`), context, 'date'),
      width: '11rem',
    },
    {
      key: 'ready',
      header: t('admin.col3.comparable'),
      width: '14rem',
      cell: (row) =>
        row.missingComparable === 0 ? (
          <StatusPill tone="success" mark="eco">
            {t('admin.catalog.missing', { count: 0 })}
          </StatusPill>
        ) : (
          <StatusPill tone="warning" mark="firstAid">
            {t('admin.catalog.missing', { count: row.missingComparable })}
          </StatusPill>
        ),
    },
    {
      key: 'status',
      header: t('admin.col.status'),
      width: '12rem',
      cell: (row) => (
        <StatusPill
          tone={SERVICE_TONE[row.status]}
          mark={row.status === 'rejected' ? 'sos' : row.status === 'published' ? 'eco' : 'chat'}
        >
          {t(`admin.serviceStatus.${row.status}`)}
        </StatusPill>
      ),
    },
    {
      key: 'action',
      header: t('admin.action.review'),
      width: '9rem',
      cell: () => <Button variant="secondary">{t('admin.action.review')}</Button>,
    },
  ];

  const attributeColumns: readonly Column<AttributeDefinition>[] = [
    {
      key: 'key',
      header: t('admin.col3.attribute'),
      cell: (row) => (
        <span className="block">
          {/* The machine key, shown as one: this is the contract the vendor
              form and the comparison engine both bind to. */}
          <span className="block font-mono text-small text-text">{row.key}</span>
          {row.unit === undefined ? null : (
            <span className="block text-caption text-text-muted">{row.unit}</span>
          )}
        </span>
      ),
    },
    {
      key: 'type',
      header: t('admin.col3.type'),
      cell: (row) => t(`admin.dataType.${row.dataType}`),
      width: '9rem',
    },
    {
      key: 'normalisation',
      header: t('admin.col3.normalisation'),
      width: '11rem',
      cell: (row) =>
        row.normalization === 'none' ? (
          <span className="text-text-muted">—</span>
        ) : (
          <span className="font-mono text-small text-text">{row.normalization}</span>
        ),
    },
    {
      key: 'options',
      header: t('admin.col3.options'),
      numeric: true,
      width: '7rem',
      cell: (row) => (row.options === 0 ? '—' : formatNumber(row.options, context)),
    },
    {
      key: 'usage',
      header: t('admin.col3.usage'),
      width: '13rem',
      cell: (row) => (
        <span className="text-small text-text-muted">
          {t('admin.catalog.usage', { count: row.valuesOnServices })}
        </span>
      ),
    },
  ];

  const categoryColumns: readonly Column<CategorySummary>[] = [
    { key: 'slug', header: t('admin.col3.category'), cell: (row) => row.slug },
    {
      key: 'attributes',
      header: t('admin.col3.attribute'),
      numeric: true,
      cell: (row) => formatNumber(row.attributes, context),
      width: '9rem',
    },
    {
      key: 'comparable',
      header: t('admin.col3.comparable'),
      numeric: true,
      cell: (row) => formatNumber(row.comparable, context),
      width: '10rem',
    },
    {
      key: 'services',
      header: t('admin.col2.services'),
      numeric: true,
      cell: (row) => formatNumber(row.services, context),
      width: '9rem',
    },
  ];

  return (
    <ConsolePage
      locale={locale}
      current="catalog"
      title={t('admin.catalog.title')}
      subtitle={t('admin.catalog.subtitle')}
    >
      <div className="flex flex-col gap-8">
        {/*
          Stated on the screen, not just in a comment: the next person to look
          at a slow comparison query will be tempted to denormalise this into
          columns, and that is the one change that cannot be undone cheaply.
        */}
        <p className="flex items-start gap-3 rounded-lg bg-info-surface px-5 py-4 text-small text-info-text">
          <Mark name="compass" size={20} noFlip className="mt-1 shrink-0" />
          {t('admin.catalog.dataAsData')}
        </p>

        <Panel
          title={t('admin.catalog.queue')}
          mark="chat"
          eyebrow={t('admin.catalog.serviceCount', { count: SERVICE_QUEUE.length })}
          flush
        >
          <p className="px-6 pb-3 text-small text-text-muted">{t('admin.catalog.queueSub')}</p>
          <DataTable
            columns={queueColumns}
            rows={SERVICE_QUEUE}
            rowKey={(row) => row.id}
            caption={t('admin.catalog.queue')}
          />
        </Panel>

        <Panel title={t('admin.catalog.attributes')} mark="pass" flush>
          <p className="px-6 pb-4 text-small text-text-muted">{t('admin.catalog.attributesSub')}</p>
          {byGroup.map(({ group, rows }) => (
            <div key={group} className="border-t border-border">
              <h3 className="px-6 pb-2 pt-4 text-overline uppercase text-text-muted">
                {t(`admin.group.${group}`)}
              </h3>
              <DataTable
                columns={attributeColumns}
                rows={rows}
                rowKey={(row) => row.id}
                density="compact"
                caption={t(`admin.group.${group}`)}
              />
            </div>
          ))}

          {descriptive.length === 0 ? null : (
            <div className="border-t border-border">
              <h3 className="flex items-center gap-2 px-6 pb-2 pt-4 text-overline uppercase text-text-muted">
                <Mark name="chat" size={16} />
                {t('admin.catalog.notComparable')}
              </h3>
              <DataTable
                columns={attributeColumns}
                rows={descriptive}
                rowKey={(row) => row.id}
                density="compact"
                caption={t('admin.catalog.notComparable')}
              />
            </div>
          )}
        </Panel>

        <Panel title={t('admin.catalog.categories')} mark="weave" flush>
          <p className="px-6 pb-3 text-small text-text-muted">{t('admin.catalog.categoriesSub')}</p>
          <DataTable
            columns={categoryColumns}
            rows={CATEGORY_SUMMARY}
            rowKey={(row) => row.slug}
            density="compact"
            caption={t('admin.catalog.categories')}
          />
        </Panel>
      </div>
    </ConsolePage>
  );
}
