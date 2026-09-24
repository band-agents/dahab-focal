import { formatCurrency, formatDate, formatNumber, money } from '@dahab/i18n/server';

import { Empty, Notice } from '@/components/ui/Bits';
import { SectionTitle } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { api, load } from '@/lib/api';
import { translator } from '@/lib/i18n';
import { Heading, resolveLocale } from '@/lib/page';

/**
 * Bookings: who is coming, then who came.
 *
 * Split in two because an operator reads them for different reasons: the
 * coming ones to get the boat ready, soonest first; the past ones to look
 * something up, latest first. Every row carries its status as a word on a
 * colour, never a colour alone.
 */

type Status =
  | 'pendingPayment'
  | 'confirmed'
  | 'awaitingVendor'
  | 'cancelledByTraveler'
  | 'cancelledByVendor'
  | 'cancelledByWeather'
  | 'noShow'
  | 'completed'
  | 'refunded'
  | 'disputed';

const TONE: Record<Status, string> = {
  pendingPayment: 'bg-c-warn-bg text-c-warn',
  confirmed: 'bg-c-ok-bg text-c-ok',
  awaitingVendor: 'bg-c-warn-bg text-c-warn',
  cancelledByTraveler: 'bg-c-raised text-c-muted',
  cancelledByVendor: 'bg-c-raised text-c-muted',
  cancelledByWeather: 'bg-c-raised text-c-muted',
  noShow: 'bg-c-bad-bg text-c-bad',
  completed: 'bg-c-info-bg text-c-info',
  refunded: 'bg-c-raised text-c-muted',
  disputed: 'bg-c-bad-bg text-c-bad',
};

export default async function BookingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale };

  const bookings = await load(() => api.vendor.bookings.query({ locale, limit: 200 }));
  const now = Date.now();
  const all = bookings.ok ? bookings.data : [];
  const coming = all.filter((row) => Date.parse(row.startsAt) >= now);
  const past = all.filter((row) => Date.parse(row.startsAt) < now).reverse();

  const list = (rows: typeof all) => (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => {
        const at = new Date(row.startsAt);
        return (
          <li key={row.id} className="flex gap-4 rounded-lg border border-c-edge bg-c-surface p-4">
            {/* A calendar leaf: the day, big, and the month over it. */}
            <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-md bg-c-info-bg py-2 text-c-info">
              <span className="text-caption font-semibold">
                {new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'Africa/Cairo' }).format(at)}
              </span>
              <span className="text-h1 font-semibold tabular-nums">
                {formatNumber(
                  Number(new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'Africa/Cairo' }).format(at)),
                  context,
                )}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-bodyL font-semibold text-c-text">{row.serviceTitle}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-body text-c-muted">
                <span className="inline-flex items-center gap-1">
                  <Icon name="clock" size={16} />
                  {formatDate(at, context, 'time')}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="people" size={16} />
                  {row.travelerName ?? t('partner.reviews.anon')} · {t('partner.bookings.people', { count: row.heads })}
                </span>
              </p>
              <p className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className={`rounded-pill px-2.5 py-0.5 text-small font-semibold ${TONE[row.status]}`}>
                  {t(`partner.bookings.status.${row.status}`)}
                </span>
                <span className="text-body font-semibold tabular-nums text-c-text">
                  {formatCurrency(money(row.total.amountMinor, row.total.currency), context, { trimZeroFraction: true })}
                </span>
              </p>
              <p className="mt-1 text-caption text-c-muted" dir="ltr">
                {row.reference}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="flex flex-col gap-5">
      <Heading title={t('partner.bookings.title')} subtitle={t('partner.bookings.subtitle')} />
      {bookings.ok ? null : <Notice tone="danger" title={t('partner.common.unreachable')} />}
      {bookings.ok && all.length === 0 ? (
        <section className="rounded-lg border border-c-edge bg-c-surface">
          <Empty icon="today" title={t('partner.bookings.empty')}>
            {t('partner.bookings.emptyText')}
          </Empty>
        </section>
      ) : null}
      {coming.length === 0 ? null : (
        <>
          <SectionTitle>{t('partner.bookings.coming', { count: coming.length })}</SectionTitle>
          {list(coming)}
        </>
      )}
      {past.length === 0 ? null : (
        <>
          <SectionTitle>{t('partner.bookings.past')}</SectionTitle>
          {list(past)}
        </>
      )}
    </div>
  );
}
