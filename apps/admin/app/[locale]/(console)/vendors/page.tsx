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
import { reviewDocument } from '@/lib/actions';
import { api, load } from '@/lib/api';
import { translator } from '@/lib/i18n';
import { neighborhoodKey, path } from '@/lib/nav';

/**
 * A02 · Operators and verification.
 *
 * Two jobs on one screen because they are the same job: the roster of who is
 * licensed to run in Dahab, and the queue of documents the platform still owes
 * an answer on. A rejection has to carry a reason the operator actually
 * receives, so"reject" is never a bare button here.
 *
 * Both halves read from the API. Either can fail on its own — the roster
 * query and the queue query are separate procedures with separate permissions
 * — so each says so separately rather than one failure blanking the screen.
 */

/** Inferred from the API rather than restated: a local type would drift. */
type Vendor = Awaited<ReturnType<typeof api.admin.vendors.query>>[number];
type QueueDocument = Awaited<ReturnType<typeof api.admin.verificationQueue.query>>[number];

const VENDOR_TONE: Record<Vendor['status'], Tone> = {
  applied: 'info',
  inReview: 'warning',
  active: 'success',
  suspended: 'danger',
  closed: 'neutral',
};

const VERIFY_TONE: Record<QueueDocument['status'], Tone> = {
  pending: 'warning',
  inReview: 'info',
  verified: 'success',
  rejected: 'danger',
  expired: 'danger',
};

/** Rating lives in hundredths so it never touches the float path. */
const RATING_SCALE = 100;

export default async function VendorsPage({
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

  const [roster, queue] = await Promise.all([
    load(() => api.admin.vendors.query()),
    load(() => api.admin.verificationQueue.query()),
  ]);

  const vendorColumns: readonly RecordColumn<Vendor>[] = [
    {
      key: 'name',
      role: 'primary',
      header: t('admin.col.vendor'),
      cell: (row) => row.displayName,
    },
    {
      key: 'area',
      role: 'secondary',
      header: t('admin.col2.area'),
      cell: (row) =>
        [
          row.neighborhood === null ? null : t(neighborhoodKey(row.neighborhood)),
          formatDate(new Date(row.joined), context, 'monthYear'),
        ]
          .filter((part): part is string => part !== null)
          .join(' · '),
      width: '11rem',
    },
    {
      key: 'status',
      role: 'end',
      header: t('admin.col.status'),
      width: '12rem',
      cell: (row) => (
        <Pill tone={VENDOR_TONE[row.status]} icon={row.status === 'suspended' ? 'ban' : 'check'}>
          {t(`admin.vendorStatus.${row.status}`)}
        </Pill>
      ),
    },
    {
      key: 'services',
      role: 'column',
      header: t('admin.col2.services'),
      numeric: true,
      cell: (row) => formatNumber(row.services, context),
      width: '7rem',
    },
    {
      key: 'staff',
      role: 'column',
      header: t('admin.col2.staff'),
      numeric: true,
      cell: (row) => formatNumber(row.staff, context),
      width: '7rem',
    },
    {
      key: 'rating',
      role: 'column',
      header: t('admin.col2.rating'),
      numeric: true,
      width: '8rem',
      // No reviews yet reads as"—", never as a zero: an operator nobody has
      // reviewed and an operator rated zero are different facts.
      cell: (row) =>
        row.ratingHundredths === null
          ? '—'
          : formatNumber(row.ratingHundredths / RATING_SCALE, context, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            }),
    },
  ];

  const queueColumns: readonly RecordColumn<QueueDocument>[] = [
    {
      key: 'vendor',
      role: 'primary',
      header: t('admin.col.vendor'),
      cell: (row) => row.vendorName,
      width: '14rem',
    },
    {
      key: 'document',
      role: 'secondary',
      header: t('admin.col.document'),
      cell: (row) => (
        <span className="block">
          <span className="block text-cLabel text-c-text">{t(`admin.docType.${row.type}`)}</span>
          {row.issuer === null ? null : (
            <span className="block text-cMeta text-c-muted">{row.issuer}</span>
          )}
          {row.documentNumber === null ? null : (
            <span className="block font-figure text-cFigureSm text-c-muted">
              {row.documentNumber}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'status',
      role: 'column',
      header: t('admin.col.status'),
      width: '13rem',
      cell: (row) => (
        <Pill
          tone={VERIFY_TONE[row.status]}
        >
          {t(`admin.verify.${row.status}`)}
        </Pill>
      ),
    },
    {
      key: 'action',
      role: 'end',
      // Its own header, not a second"Status": two identical column headers in
      // one table are ambiguous to read and worse to navigate by screen reader.
      header: t('admin.action.review'),
      width: '9rem',
      // A link, not a button that acts. Opening the review panel is the whole
      // job of this control — the decision, its reason and its audit row
      // happen one screen further in, deliberately.
      cell: (row) => (
        <Link
          href={`/${locale}/vendors?review=${row.id}` as Route}
          className="inline-flex min-h-11 items-center rounded-input border border-c-edge-strong bg-c-surface px-4 font-ui text-cLabel text-c-text hover:bg-c-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {t('admin.action.review')}
        </Link>
      ),
    },
  ];

  const reviewing =
    queue.ok && review !== undefined ? queue.data.find((row) => row.id === review) : undefined;

  return (
    <ConsolePage
      locale={locale}
      current="vendors"
      title={t('admin.vendors.title')}
      subtitle={t('admin.vendors.subtitle')}
      headerEnd={
        roster.ok ? (
          <span className="flex items-center gap-3 rounded-c-xs bg-c-info-bg ps-4 pe-5 py-2">
            <Icon name="operators" size={20} />
            <span className="font-console text-cHeading text-c-text">
              {formatNumber(roster.data.length, context)}
            </span>
          </span>
        ) : null
      }
    >
      <div className="flex flex-col gap-8">
        {outcome === undefined ? null : <OutcomeNotice outcome={outcome} t={t} />}

        {reviewing === undefined ? null : (
          <ReviewPanel
            t={t}
            title={t('admin.documentReview.title')}
            summary={
              <span className="block">
                <span className="block font-console text-cHeading text-c-text">
                  {t('admin.documentReview.of', {
                    type: t(`admin.docType.${reviewing.type}`),
                    // A Latin operator name inside an Arabic sentence walks to
                    // the wrong end of the line without this.
                    vendor: isolate(reviewing.vendorName),
                  })}
                </span>
                {reviewing.issuer === null ? null : (
                  <span className="mt-1 block text-cMeta text-c-muted">{reviewing.issuer}</span>
                )}
                {reviewing.expiresOn === null ? null : (
                  <span className="block text-cMeta text-c-muted">
                    {formatDate(new Date(reviewing.expiresOn), context, 'date')}
                  </span>
                )}
              </span>
            }
            action={reviewDocument}
            hidden={{ locale, documentId: reviewing.id }}
            approve={{ value: 'verified', label: t('admin.documentReview.verify'), icon: 'check' }}
            reject={{ value: 'rejected', label: t('admin.documentReview.reject'), icon: 'ban' }}
            reasonLabel={t('admin.review.reason')}
            reasonHint={t('admin.review.reasonHint')}
            closeHref={`/${locale}/vendors` as Route}
          />
        )}

        {!queue.ok ? (
          <DataProblemNotice problem={queue.problem} t={t} title={t('admin.vendors.queue')} />
        ) : (
          <Panel
            title={t('admin.vendors.queue')}
            figure={t('admin.expiry.count', { count: queue.data.length })}
            flush
          >
            <p className="px-4 pb-2 pt-3 text-cMeta text-c-muted">{t('admin.vendors.queueSub')}</p>
            {queue.data.length === 0 ? (
              <div className="flex items-center gap-4 px-4 pb-6">
                <p className="text-cLabel text-c-text-muted">{t('admin.vendors.noneQueue')}</p>
              </div>
            ) : (
              <RecordList
                columns={queueColumns}
                rows={queue.data}
                rowKey={(row) => row.id}
                caption={t('admin.vendors.queue')}
              />
            )}
          </Panel>
        )}

        {!roster.ok ? (
          <DataProblemNotice problem={roster.problem} t={t} title={t('admin.vendors.roster')} />
        ) : (
          <Panel
            title={t('admin.vendors.roster')}
            figure={formatNumber(roster.data.length, context)}
            flush
          >
            <RecordList
              columns={vendorColumns}
              rows={roster.data}
              rowKey={(row) => row.id}
              // The point of the roster: every operator opens its own page.
              href={(row) => path(locale, `vendors/${row.id}`)}
              caption={t('admin.vendors.roster')}
              empty={
                <p className="font-console text-cBody text-c-muted">{t('admin.vendors.none')}</p>
              }
            />
          </Panel>
        )}
      </div>
    </ConsolePage>
  );
}
