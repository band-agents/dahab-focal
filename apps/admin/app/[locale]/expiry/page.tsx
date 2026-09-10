import { formatDate } from '@dahab/i18n/server';
import { DataTable, Illo, Mark, Panel, StatusPill } from '@dahab/ui-web';
import type { Column } from '@dahab/ui-web';

import { ConsolePage, resolveLocale } from '@/components/ConsoleShell';
import { translator } from '@/lib/i18n';
import { DOCUMENTS, TODAY, bandFor, vendorName } from '@/lib/vendors';
import type { ExpiryBand, VendorDocument } from '@/lib/vendors';

/**
 * A03 · The expiry board.
 *
 * Its own screen, because expiry is the theme of the whole vendor model: a
 * permit, an insurance certificate, a staff rating and a tank's hydrostatic
 * test all lapse, and every one has to surface before it does rather than on
 * the morning a boat is due out.
 *
 * Grouped by how long is left, not by operator — the question this screen
 * answers is "what stops working this week", and that crosses operators.
 */

/** Bands in the order they demand attention. `later` is deliberately absent. */
const BANDS: readonly ExpiryBand[] = ['expired', 'within7', 'within30', 'within90'];

const BAND_LABEL: Record<Exclude<ExpiryBand, 'later'>, string> = {
  expired: 'admin.expiry.expired',
  within7: 'admin.expiry.within7',
  within30: 'admin.expiry.within30',
  within90: 'admin.expiry.within90',
};

export default async function ExpiryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;

  const dated = DOCUMENTS.map((doc) => ({ doc, band: bandFor(doc.expires, TODAY) }));
  const grouped = BANDS.map((band) => ({
    band,
    rows: dated.filter((entry) => entry.band === band).map((entry) => entry.doc),
  }));

  const columns: readonly Column<VendorDocument>[] = [
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
      key: 'issuer',
      header: t('admin.col2.issuer'),
      cell: (row) => <span className="text-small text-text-muted">{row.issuer}</span>,
      width: '13rem',
    },
    {
      key: 'expires',
      header: t('admin.col.expires'),
      cell: (row) =>
        row.expires === null ? '—' : formatDate(new Date(`${row.expires}T00:00:00Z`), context, 'date'),
      width: '11rem',
    },
    {
      key: 'consequence',
      header: t('admin.col.status'),
      width: '16rem',
      cell: (row) =>
        row.blocksPublishing ? (
          <StatusPill tone="danger" mark="sos">
            {t('admin.expiry.blocks')}
          </StatusPill>
        ) : (
          <StatusPill tone="neutral" mark="pass">
            {t(`admin.verify.${row.status}`)}
          </StatusPill>
        ),
    },
  ];

  return (
    <ConsolePage
      locale={locale}
      current="expiry"
      title={t('admin.expiryPage.title')}
      subtitle={t('admin.expiryPage.subtitle')}
    >
      <div className="flex flex-col gap-8">
        {grouped.map(({ band, rows }) => (
          <Panel
            key={band}
            title={t(BAND_LABEL[band as Exclude<ExpiryBand, 'later'>])}
            mark={band === 'expired' ? 'sos' : band === 'within7' ? 'firstAid' : 'tank'}
            eyebrow={t('admin.expiry.count', { count: rows.length })}
            flush
          >
            {rows.length === 0 ? (
              <div className="flex items-center gap-4 px-6 pb-6 pt-2">
                <Illo name="coralFan" size={56} />
                <p className="text-body text-text-muted">{t('admin.expiryPage.none')}</p>
              </div>
            ) : (
              <>
                {rows.some((row) => row.blocksPublishing) ? (
                  <p className="flex items-center gap-2 px-6 pb-3 text-small text-text-muted">
                    <Mark name="noFly" size={16} />
                    {t('admin.expiryPage.blocksNote')}
                  </p>
                ) : null}
                <DataTable
                  columns={columns}
                  rows={rows}
                  rowKey={(row) => row.id}
                  caption={t(BAND_LABEL[band as Exclude<ExpiryBand, 'later'>])}
                />
              </>
            )}
          </Panel>
        ))}
      </div>
    </ConsolePage>
  );
}
