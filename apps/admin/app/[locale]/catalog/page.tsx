import { formatDate, formatNumber } from '@dahab/i18n/server';
import { Button, DataTable, Illo, Mark, Panel, StatusPill } from '@dahab/ui-web';
import type { Column, StatusTone } from '@dahab/ui-web';

import { ConsolePage, resolveLocale } from '@/components/ConsoleShell';
import { DataProblemNotice } from '@/components/DataProblemNotice';
import { api, load } from '@/lib/api';
import { translator } from '@/lib/i18n';

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
 *
 * All three panels read the API, each through its own permission, so a
 * failure in one says so where it happened instead of blanking the screen.
 */

type QueueItem = Awaited<ReturnType<typeof api.admin.serviceQueue.query>>[number];
type Attribute = Awaited<ReturnType<typeof api.admin.attributeUsage.query>>[number];
type Category = Awaited<ReturnType<typeof api.admin.categories.query>>[number];

const SERVICE_TONE: Record<QueueItem['status'], StatusTone> = {
  draft: 'neutral',
  underReview: 'warning',
  published: 'success',
  paused: 'info',
  archived: 'neutral',
  rejected: 'danger',
};

/** The category whose attribute set this screen manages. */
const DIVING = 'scuba-diving';

export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;

  const [queue, attributes, categories] = await Promise.all([
    load(() => api.admin.serviceQueue.query({ locale })),
    load(() => api.admin.attributeUsage.query({ categorySlug: DIVING })),
    load(() => api.admin.categories.query()),
  ]);

  // Grouped in the order the comparison table reads them, with anything the
  // data carries but this order does not yet name appended rather than
  // dropped — a silently missing group would be a silently missing row.
  const groups = attributes.ok ? groupOrder(attributes.data) : [];
  const descriptive = attributes.ok
    ? attributes.data.filter((attribute) => !attribute.isComparable)
    : [];

  const queueColumns: readonly Column<QueueItem>[] = [
    {
      key: 'title',
      header: t('admin.col.service'),
      cell: (row) => (
        <span className="block">
          <span className="block text-body text-text">{row.title}</span>
          <span className="block text-small text-text-muted">{row.vendorName}</span>
        </span>
      ),
    },
    {
      key: 'category',
      header: t('admin.col3.category'),
      cell: (row) => row.categorySlug,
      width: '11rem',
    },
    {
      key: 'submitted',
      header: t('admin.col3.submitted'),
      cell: (row) => formatDate(new Date(row.submittedAt), context, 'date'),
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
      // Inert until the writes pass: publishing a listing is a decision with a
      // reason and an audit row behind it, and a button that does none of
      // those is worse than one that is not there yet.
      cell: () => (
        <Button variant="secondary" disabled>
          {t('admin.action.review')}
        </Button>
      ),
    },
  ];

  const attributeColumns: readonly Column<Attribute>[] = [
    {
      key: 'key',
      header: t('admin.col3.attribute'),
      cell: (row) => (
        <span className="block">
          {/* The machine key, shown as one: this is the contract the vendor
              form and the comparison engine both bind to. */}
          <span className="block font-mono text-small text-text">{row.key}</span>
          {row.unit === null ? null : (
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

  const categoryColumns: readonly Column<Category>[] = [
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
      // Published against total: a category with six listings of which one is
      // live is a different state from one with six live, and the count on
      // its own hides which.
      cell: (row) => (
        <span>
          {formatNumber(row.publishedServices, context)}
          <span className="text-text-muted"> / {formatNumber(row.services, context)}</span>
        </span>
      ),
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

        {!queue.ok ? (
          <DataProblemNotice problem={queue.problem} t={t} title={t('admin.catalog.queue')} />
        ) : (
          <Panel
            title={t('admin.catalog.queue')}
            mark="chat"
            eyebrow={t('admin.catalog.serviceCount', { count: queue.data.length })}
            flush
          >
            <p className="px-6 pb-3 text-small text-text-muted">{t('admin.catalog.queueSub')}</p>
            {queue.data.length === 0 ? (
              <div className="flex items-center gap-4 px-6 pb-6">
                <Illo name="seaTurtle" size={56} />
                <p className="text-body text-text-muted">{t('admin.catalog.noQueue')}</p>
              </div>
            ) : (
              <DataTable
                columns={queueColumns}
                rows={queue.data}
                rowKey={(row) => row.id}
                caption={t('admin.catalog.queue')}
              />
            )}
          </Panel>
        )}

        {!attributes.ok ? (
          <DataProblemNotice
            problem={attributes.problem}
            t={t}
            title={t('admin.catalog.attributes')}
          />
        ) : (
          <Panel title={t('admin.catalog.attributes')} mark="pass" flush>
            <p className="px-6 pb-4 text-small text-text-muted">{t('admin.catalog.attributesSub')}</p>
            {groups.map(({ group, rows }) => (
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
        )}

        {!categories.ok ? (
          <DataProblemNotice
            problem={categories.problem}
            t={t}
            title={t('admin.catalog.categories')}
          />
        ) : (
          <Panel title={t('admin.catalog.categories')} mark="weave" flush>
            <p className="px-6 pb-3 text-small text-text-muted">{t('admin.catalog.categoriesSub')}</p>
            <DataTable
              columns={categoryColumns}
              rows={categories.data}
              rowKey={(row) => row.slug}
              density="compact"
              caption={t('admin.catalog.categories')}
            />
          </Panel>
        )}
      </div>
    </ConsolePage>
  );
}

/** The comparison order, with anything unexpected kept rather than dropped. */
const COMPARISON_GROUPS = [
  'profile',
  'requirements',
  'guiding',
  'logistics',
  'safety',
  'inclusions',
] as const;

function groupOrder(
  attributes: readonly Attribute[],
): readonly { group: string; rows: Attribute[] }[] {
  const comparable = attributes.filter(
    (attribute) => attribute.isComparable && attribute.comparisonGroup !== null,
  );
  const names = [
    ...COMPARISON_GROUPS,
    ...new Set(
      comparable
        .map((attribute) => attribute.comparisonGroup as string)
        .filter((group) => !(COMPARISON_GROUPS as readonly string[]).includes(group)),
    ),
  ];

  return names
    .map((group) => ({
      group,
      rows: comparable.filter((attribute) => attribute.comparisonGroup === group),
    }))
    .filter((entry) => entry.rows.length > 0);
}
