import { formatDate, formatNumber } from '@dahab/i18n/server';
import { Button, DataTable, Illo, Mark, Panel, StatusPill } from '@dahab/ui-web';
import type { Column, StatusTone } from '@dahab/ui-web';

import { ConsolePage, resolveLocale } from '@/components/ConsoleShell';
import { translator } from '@/lib/i18n';
import { DOCUMENTS, VENDORS, vendorName } from '@/lib/vendors';
import type { Vendor, VendorDocument, VendorStatus, VerificationStatus } from '@/lib/vendors';

/**
 * A02 · Operators and verification.
 *
 * Two jobs on one screen because they are the same job: the roster of who is
 * licensed to run in Dahab, and the queue of documents the platform still owes
 * an answer on. A rejection has to carry a reason the operator actually
 * receives, so "reject" is never a bare button here.
 */

const VENDOR_TONE: Record<VendorStatus, StatusTone> = {
  applied: 'info',
  inReview: 'warning',
  active: 'success',
  suspended: 'danger',
  closed: 'neutral',
};

const VERIFY_TONE: Record<VerificationStatus, StatusTone> = {
  pending: 'warning',
  inReview: 'info',
  verified: 'success',
  rejected: 'danger',
  expired: 'danger',
};

/** Rating lives in hundredths so it never touches the float path. */
const RATING_SCALE = 100;

export default async function VendorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;

  /** Anything the platform still owes an answer on. */
  const queue = DOCUMENTS.filter(
    (doc) => doc.status === 'pending' || doc.status === 'inReview' || doc.status === 'rejected',
  );

  const vendorColumns: readonly Column<Vendor>[] = [
    {
      key: 'name',
      header: t('admin.col.vendor'),
      cell: (row) => (
        <span className="block">
          <span className="block text-body text-text">{row.displayName}</span>
          <span className="block text-small text-text-muted">
            {formatDate(new Date(`${row.joined}T00:00:00Z`), context, 'monthYear')}
          </span>
        </span>
      ),
    },
    { key: 'area', header: t('admin.col2.area'), cell: (row) => row.neighborhood, width: '11rem' },
    {
      key: 'status',
      header: t('admin.col.status'),
      width: '12rem',
      cell: (row) => (
        <StatusPill
          tone={VENDOR_TONE[row.status]}
          mark={row.status === 'suspended' ? 'sos' : row.status === 'active' ? 'eco' : 'chat'}
        >
          {t(`admin.vendorStatus.${row.status}`)}
        </StatusPill>
      ),
    },
    {
      key: 'services',
      header: t('admin.col2.services'),
      numeric: true,
      cell: (row) => formatNumber(row.services, context),
      width: '7rem',
    },
    {
      key: 'staff',
      header: t('admin.col2.staff'),
      numeric: true,
      cell: (row) => formatNumber(row.staff, context),
      width: '7rem',
    },
    {
      key: 'rating',
      header: t('admin.col2.rating'),
      numeric: true,
      width: '8rem',
      cell: (row) =>
        row.ratingHundredths === null
          ? '—'
          : formatNumber(row.ratingHundredths / RATING_SCALE, context, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            }),
    },
  ];

  const queueColumns: readonly Column<VendorDocument>[] = [
    {
      key: 'vendor',
      header: t('admin.col.vendor'),
      cell: (row) => vendorName(row.vendorId),
      width: '14rem',
    },
    {
      key: 'document',
      header: t('admin.col.document'),
      cell: (row) => (
        <span className="block">
          <span className="block text-body text-text">{t(`admin.docType.${row.type}`)}</span>
          {row.detail === undefined ? null : (
            <span className="block text-small text-text-muted">{row.detail}</span>
          )}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('admin.col.status'),
      width: '13rem',
      cell: (row) => (
        <StatusPill
          tone={VERIFY_TONE[row.status]}
          mark={row.status === 'rejected' ? 'sos' : row.status === 'pending' ? 'firstAid' : 'chat'}
        >
          {t(`admin.verify.${row.status}`)}
        </StatusPill>
      ),
    },
    {
      key: 'action',
      // Its own header, not a second "Status": two identical column headers in
      // one table are ambiguous to read and worse to navigate by screen reader.
      header: t('admin.action.review'),
      width: '9rem',
      cell: () => <Button variant="secondary">{t('admin.action.review')}</Button>,
    },
  ];

  return (
    <ConsolePage
      locale={locale}
      current="vendors"
      title={t('admin.vendors.title')}
      subtitle={t('admin.vendors.subtitle')}
      headerEnd={
        <span className="flex items-center gap-3 rounded-pill bg-info-surface ps-4 pe-5 py-2">
          <Mark name="compass" size={20} noFlip />
          <span className="font-display text-h3 text-text">{formatNumber(VENDORS.length, context)}</span>
        </span>
      }
    >
      <div className="flex flex-col gap-8">
        <Panel
          title={t('admin.vendors.queue')}
          mark="chat"
          eyebrow={t('admin.expiry.count', { count: queue.length })}
          flush
        >
          <p className="px-6 pb-3 text-small text-text-muted">{t('admin.vendors.queueSub')}</p>
          {queue.length === 0 ? (
            <div className="flex items-center gap-4 px-6 pb-6">
              <Illo name="seaTurtle" size={56} />
              <p className="text-body text-text-muted">{t('admin.vendors.noneQueue')}</p>
            </div>
          ) : (
            <DataTable
              columns={queueColumns}
              rows={queue}
              rowKey={(row) => row.id}
              caption={t('admin.vendors.queue')}
            />
          )}
        </Panel>

        <Panel title={t('admin.vendors.roster')} mark="pass" flush>
          <DataTable
            columns={vendorColumns}
            rows={VENDORS}
            rowKey={(row) => row.id}
            caption={t('admin.vendors.roster')}
            empty={<p className="text-body text-text-muted">{t('admin.vendors.none')}</p>}
          />
        </Panel>
      </div>
    </ConsolePage>
  );
}
