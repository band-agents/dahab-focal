import { formatDate } from '@dahab/i18n/server';
import { DataTable, Illo, Mark, Panel, StatusPill } from '@dahab/ui-web';
import type { Column } from '@dahab/ui-web';

import { ConsolePage, resolveLocale } from '@/components/ConsoleShell';
import { DataProblemNotice } from '@/components/DataProblemNotice';
import { api, load } from '@/lib/api';
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
 * answers is "what stops working this week", and that crosses operators.
 *
 * Reads from the API. If the API cannot answer, the screen says so instead of
 * rendering an empty table, because "nothing is expiring" is the one wrong
 * answer this particular screen must never give.
 */

type Band = 'expired' | 'within7' | 'within30' | 'within90';

const BANDS: readonly Band[] = ['expired', 'within7', 'within30', 'within90'];

const BAND_LABEL: Record<Band, string> = {
  expired: 'admin.expiry.expired',
  within7: 'admin.expiry.within7',
  within30: 'admin.expiry.within30',
  within90: 'admin.expiry.within90',
};

/**
 * Inferred from the API rather than restated here. A local interface would be
 * a second copy of the contract, and the two would drift the first time a
 * column moved.
 */
type ExpiringDocument = Awaited<ReturnType<typeof api.admin.expiring.query>>[number];

const MS_PER_DAY = 86_400_000;

/**
 * Which band a date falls in, measured in whole UTC days. Egypt observes DST,
 * so nothing here does arithmetic in local time.
 */
function bandFor(expiresOn: string | null, now: Date): Band | null {
  if (expiresOn === null) return null;
  const due = Date.parse(`${expiresOn}T00:00:00Z`);
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  const days = Math.round((due - today) / MS_PER_DAY);
  if (days < 0) return 'expired';
  if (days <= 7) return 'within7';
  if (days <= 30) return 'within30';
  if (days <= 90) return 'within90';
  return null;
}

export default async function ExpiryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;
  const now = new Date();

  const result = await load(() => api.admin.expiring.query({ withinDays: 90 }));

  const columns: readonly Column<ExpiringDocument>[] = [
    {
      key: 'vendor',
      header: t('admin.col.vendor'),
      cell: (row) => row.vendorName,
      width: '14rem',
    },
    {
      key: 'document',
      header: t('admin.col.document'),
      cell: (row) => (
        <span className="block">
          <span className="block text-body text-text">{t(`admin.docType.${row.type}`)}</span>
          {row.issuer === null ? null : (
            <span className="block text-small text-text-muted">{row.issuer}</span>
          )}
          {row.documentNumber === null ? null : (
            <span className="block font-mono text-caption text-text-muted">
              {row.documentNumber}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'expires',
      header: t('admin.col.expires'),
      cell: (row) =>
        row.expiresOn === null
          ? '—'
          : formatDate(new Date(`${row.expiresOn}T00:00:00Z`), context, 'date'),
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
