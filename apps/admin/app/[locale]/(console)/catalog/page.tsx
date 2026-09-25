import Link from 'next/link';
import type { Route } from 'next';

import { formatDate, formatNumber, isolate } from '@dahab/i18n/server';

import {
  Icon,
  Panel,
  Pill,
  RecordList,
  type RecordColumn,
  type Tone,
} from '@/components/console';
import { ConsolePage, resolveLocale } from '@/components/ConsoleShell';
import { DataProblemNotice } from '@/components/DataProblemNotice';
import { OutcomeNotice, ReviewPanel } from '@/components/ReviewPanel';
import { reviewService } from '@/lib/actions';
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

const SERVICE_TONE: Record<QueueItem['status'], Tone> = {
  draft: 'neutral',
  underReview: 'warning',
  published: 'success',
  paused: 'info',
  archived: 'neutral',
  rejected: 'danger',
};

/** The category whose attribute set this screen manages. */
const DIVING = 'scuba-diving';

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ review?: string; outcome?: string }>;
}) {
  const { locale: raw } = await params;
  const { review, outcome } = await searchParams;
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

  const queueColumns: readonly RecordColumn<QueueItem>[] = [
    {
      key: 'title',
      role: 'primary',
      header: t('admin.col.service'),
      cell: (row) => (
        <span className="block">
          <span className="block text-cLabel text-c-text">{row.title}</span>
          <span className="block text-cMeta text-c-muted">{row.vendorName}</span>
        </span>
      ),
    },
    {
      key: 'category',
      role: 'secondary',
      header: t('admin.col3.category'),
      cell: (row) => row.categorySlug,
      width: '11rem',
    },
    {
      key: 'submitted',
      role: 'column',
      header: t('admin.col3.submitted'),
      cell: (row) => formatDate(new Date(row.submittedAt), context, 'date'),
      width: '11rem',
    },
    {
      key: 'ready',
      role: 'column',
      header: t('admin.col3.comparable'),
      width: '14rem',
      cell: (row) =>
        row.missingComparable === 0 ? (
          <Pill tone="success" icon="check">
            {t('admin.catalog.missing', { count: 0 })}
          </Pill>
        ) : (
          <Pill tone="warning" icon="alert">
            {t('admin.catalog.missing', { count: row.missingComparable })}
          </Pill>
        ),
    },
    {
      key: 'status',
      role: 'column',
      header: t('admin.col.status'),
      width: '12rem',
      cell: (row) => (
        <Pill
          tone={SERVICE_TONE[row.status]}
        >
          {t(`admin.serviceStatus.${row.status}`)}
        </Pill>
      ),
    },
    {
      key: 'action',
      role: 'end',
      header: t('admin.action.review'),
      width: '9rem',
      // A link. Publishing is what puts a listing in front of travellers, so
      // it happens in the review panel with a reason attached, never from a
      // button sitting in a table row.
      cell: (row) => (
        <Link
          href={`/${locale}/catalog?review=${row.id}` as Route}
          className="inline-flex min-h-11 items-center rounded-input border border-c-edge-strong bg-c-surface px-4 font-ui text-cLabel text-c-text hover:bg-c-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {t('admin.action.review')}
        </Link>
      ),
    },
  ];

  const reviewing =
    queue.ok && review !== undefined ? queue.data.find((row) => row.id === review) : undefined;

  const attributeColumns: readonly RecordColumn<Attribute>[] = [
    {
      key: 'key',
      role: 'primary',
      header: t('admin.col3.attribute'),
      cell: (row) => (
        <span className="block">
          {/* The machine key, shown as one: this is the contract the vendor
              form and the comparison engine both bind to. */}
          <span className="block font-mono text-cMeta text-c-text">{row.key}</span>
          {row.unit === null ? null : (
            <span className="block text-cMeta text-c-muted">{row.unit}</span>
          )}
        </span>
      ),
    },
    {
      key: 'type',
      role: 'secondary',
      header: t('admin.col3.type'),
      cell: (row) => t(`admin.dataType.${row.dataType}`),
      width: '9rem',
    },
    {
      key: 'normalisation',
      role: 'column',
      header: t('admin.col3.normalisation'),
      width: '11rem',
      cell: (row) =>
        row.normalization === 'none' ? (
          <span className="text-c-muted">—</span>
        ) : (
          <span className="font-mono text-cMeta text-c-text">{row.normalization}</span>
        ),
    },
    {
      key: 'options',
      role: 'column',
      header: t('admin.col3.options'),
      numeric: true,
      width: '7rem',
      cell: (row) => (row.options === 0 ? '—' : formatNumber(row.options, context)),
    },
    {
      key: 'usage',
      role: 'end',
      header: t('admin.col3.usage'),
      width: '13rem',
      cell: (row) => (
        <span className="text-cMeta text-c-muted">
          {t('admin.catalog.usage', { count: row.valuesOnServices })}
        </span>
      ),
    },
  ];

  const categoryColumns: readonly RecordColumn<Category>[] = [
    {
      key: 'slug',
      role: 'primary',
      header: t('admin.col3.category'),
      cell: (row) => row.slug,
    },
    {
      key: 'attributes',
      role: 'secondary',
      header: t('admin.col3.attribute'),
      numeric: true,
      cell: (row) => formatNumber(row.attributes, context),
      width: '9rem',
    },
    {
      key: 'comparable',
      role: 'column',
      header: t('admin.col3.comparable'),
      numeric: true,
      cell: (row) => formatNumber(row.comparable, context),
      width: '10rem',
    },
    {
      key: 'services',
      role: 'end',
      header: t('admin.col2.services'),
      numeric: true,
      // Published against total: a category with six listings of which one is
      // live is a different state from one with six live, and the count on
      // its own hides which.
      cell: (row) => (
        <span>
          {formatNumber(row.publishedServices, context)}
          <span className="text-c-muted"> / {formatNumber(row.services, context)}</span>
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
        <p className="flex items-start gap-3 rounded-c-sm bg-c-info-bg px-5 py-4 text-cMeta text-c-info">
          <Icon name="operators" size={20} />
          {t('admin.catalog.dataAsData')}
        </p>

        {outcome === undefined ? null : <OutcomeNotice outcome={outcome} t={t} />}

        {reviewing === undefined ? null : (
          <ReviewPanel
            t={t}
            title={t('admin.serviceReview.title')}
            summary={
              <span className="block">
                <span className="block font-console text-cHeading text-c-text">
                  {t('admin.serviceReview.of', {
                    title: isolate(reviewing.title),
                    vendor: isolate(reviewing.vendorName),
                  })}
                </span>
                {/*
                  The unanswered comparable count is the one fact that should
                  change a decision here: a listing published with gaps is a
                  listing that cannot be compared, which is the product's
                  whole premise.
                */}
                <span className="mt-1 block text-cMeta text-c-muted">
                  {t('admin.serviceReview.missing', { count: reviewing.missingComparable })}
                </span>
              </span>
            }
            action={reviewService}
            hidden={{ locale, serviceId: reviewing.id }}
            approve={{ value: 'published', label: t('admin.serviceReview.publish'), icon: 'check' }}
            reject={{ value: 'rejected', label: t('admin.serviceReview.reject'), icon: 'ban' }}
            reasonLabel={t('admin.review.reason')}
            reasonHint={t('admin.review.reasonHint')}
            closeHref={`/${locale}/catalog` as Route}
          />
        )}

        {!queue.ok ? (
          <DataProblemNotice problem={queue.problem} t={t} title={t('admin.catalog.queue')} />
        ) : (
          <Panel
            title={t('admin.catalog.queue')}
            figure={t('admin.catalog.serviceCount', { count: queue.data.length })}
            flush
          >
            <p className="px-4 pb-2 pt-3 text-cMeta text-c-muted">{t('admin.catalog.queueSub')}</p>
            {queue.data.length === 0 ? (
              <div className="flex items-center gap-4 px-4 pb-6">
                <p className="text-cLabel text-c-text-muted">{t('admin.catalog.noQueue')}</p>
              </div>
            ) : (
              <RecordList
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
          <Panel title={t('admin.catalog.attributes')} flush>
            <p className="px-4 pb-3 text-cMeta text-c-muted">{t('admin.catalog.attributesSub')}</p>
            {groups.map(({ group, rows }) => (
              <div key={group} className="border-t border-c-edge">
                <h3 className="px-4 pb-2 pt-4 text-cOverline uppercase text-c-muted">
                  {t(`admin.group.${group}`)}
                </h3>
                <RecordList
                  columns={attributeColumns}
                  rows={rows}
                  rowKey={(row) => row.id}
                  caption={t(`admin.group.${group}`)}
                />
              </div>
            ))}

            {descriptive.length === 0 ? null : (
              <div className="border-t border-c-edge">
                <h3 className="flex items-center gap-2 px-4 pb-2 pt-4 text-cOverline uppercase text-c-muted">
                  <Icon name="doc" size={16} />
                  {t('admin.catalog.notComparable')}
                </h3>
                <RecordList
                  columns={attributeColumns}
                  rows={descriptive}
                  rowKey={(row) => row.id}
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
          <Panel title={t('admin.catalog.categories')} flush>
            <p className="px-4 pb-2 pt-3 text-cMeta text-c-muted">{t('admin.catalog.categoriesSub')}</p>
            <RecordList
              columns={categoryColumns}
              rows={categories.data}
              rowKey={(row) => row.slug}
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
