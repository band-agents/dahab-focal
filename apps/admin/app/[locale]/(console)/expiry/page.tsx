import { formatDate } from '@dahab/i18n/server';

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
import { BANDS, BAND_LABEL, bandFor } from '@/lib/expiry';
import { translator } from '@/lib/i18n';

/**
 * A03 · The expiry board.
 *
 * Its own screen, because expiry is the theme of the whole vendor model: a
 * permit, an insurance certificate, a staff rating and a tank's hydrostatic
 * test all lapse, and every one has to surface before it does rather than on
 * the morning a boat is due out.
 *
 * Grouped by how long is left, not by operator — the question this screen
 * answers is"what stops working this week", and that crosses operators.
 *
 * Reads from the API. If the API cannot answer, the screen says so instead of
 * rendering an empty table, because"nothing is expiring" is the one wrong
 * answer this particular screen must never give.
 */

/**
 * Inferred from the API rather than restated here. A local interface would be
 * a second copy of the contract, and the two would drift the first time a
 * column moved.
 */
type ExpiringDocument = Awaited<ReturnType<typeof api.admin.expiring.query>>[number];

export default async function ExpiryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;
  const now = new Date();

  const result = await load(() => api.admin.expiring.query({ withinDays: 90 }));

  const columns: readonly RecordColumn<ExpiringDocument>[] = [
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
      key: 'expires',
      role: 'column',
      header: t('admin.col.expires'),
      cell: (row) =>
        row.expiresOn === null
          ? '—'
          : formatDate(new Date(`${row.expiresOn}T00:00:00Z`), context, 'date'),
      width: '11rem',
    },
    {
      key: 'consequence',
      role: 'end',
      header: t('admin.col.status'),
      width: '16rem',
      cell: (row) =>
        row.blocksPublishing ? (
          <Pill tone="danger" icon="ban">
            {t('admin.expiry.blocks')}
          </Pill>
        ) : (
          <Pill tone="neutral" icon="check">
            {t(`admin.verify.${row.status}`)}
          </Pill>
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
      {!result.ok ? (
        <DataProblemNotice problem={result.problem} t={t} title={t('admin.expiryPage.title')} />
      ) : (
        <div className="flex flex-col gap-8">
          {BANDS.map((band) => {
            const rows: ExpiringDocument[] = result.data.filter(
              (doc) => bandFor(doc.expiresOn, now) === band,
            );
            return (
              <Panel
                key={band}
                title={t(BAND_LABEL[band])}
                figure={t('admin.expiry.count', { count: rows.length })}
                flush
              >
                {rows.length === 0 ? (
                  <div className="flex items-center gap-4 px-4 pb-6 pt-2">
                    <p className="text-cLabel text-c-text-muted">{t('admin.expiryPage.none')}</p>
                  </div>
                ) : (
                  <>
                    {rows.some((row) => row.blocksPublishing) ? (
                      <p className="flex items-center gap-2 px-4 pb-3 text-cMeta text-c-muted">
                        <Icon name="alert" size={16} />
                        {t('admin.expiryPage.blocksNote')}
                      </p>
                    ) : null}
                    <RecordList
                      columns={columns}
                      rows={rows}
                      rowKey={(row) => row.id}
                      caption={t(BAND_LABEL[band])}
                    />
                  </>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </ConsolePage>
  );
}
