import { formatCurrency, money } from '@dahab/i18n/server';

import { Empty, Notice } from '@/components/ui/Bits';
import { Icon } from '@/components/ui/Icon';
import { api, load } from '@/lib/api';
import { translator } from '@/lib/i18n';
import { Heading, resolveLocale } from '@/lib/page';

/**
 * My trips: what travellers can book, and whether they can see it yet.
 *
 * Listings are published by Dahab Focal after a check, so this screen reads
 * rather than edits. What it adds is the one thing an operator can act on:
 * a listing with unanswered details is left off the comparison table, and it
 * says so in a sentence under the trip.
 */
export default async function TripsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale };

  const services = await load(() => api.vendor.services.query({ locale }));
  const all = services.ok ? services.data : [];

  return (
    <div className="flex flex-col gap-5">
      <Heading title={t('partner.trips.title')} subtitle={t('partner.trips.subtitle')} />
      {services.ok ? null : <Notice tone="danger" title={t('partner.common.unreachable')} />}
      {services.ok && all.length === 0 ? (
        <section className="rounded-lg border border-c-edge bg-c-surface">
          <Empty icon="boat" title={t('partner.trips.empty')}>
            {t('partner.trips.emptyText')}
          </Empty>
        </section>
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-2">
        {all.map((service) => {
          const live = service.status === 'published';
          return (
            <li key={service.id} className="flex flex-col gap-3 rounded-lg border border-c-edge bg-c-surface p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-md bg-c-info-bg text-c-info">
                  <Icon name={service.categorySlug.includes('div') ? 'tank' : 'boat'} size={24} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-bodyL font-semibold text-c-text">{service.title}</p>
                  {service.fromPrice === null ? null : (
                    <p className="text-body text-c-muted">
                      {t('partner.trips.from', {
                        price: formatCurrency(
                          money(service.fromPrice.amountMinor, service.fromPrice.currency),
                          context,
                          { trimZeroFraction: true },
                        ),
                      })}
                    </p>
                  )}
                </div>
              </div>
              <span
                className={`inline-flex w-fit items-center gap-1.5 rounded-pill px-3 py-1 text-small font-semibold ${
                  live ? 'bg-c-ok-bg text-c-ok' : 'bg-c-raised text-c-muted'
                }`}
              >
                <Icon name={live ? 'check' : 'clock'} size={16} />
                {live ? t('partner.trips.live') : t(`partner.trips.status.${service.status}`)}
              </span>
              {service.missingComparable === 0 ? null : (
                <p className="rounded-md bg-c-warn-bg px-3 py-2 text-body text-c-warn">
                  {t('partner.trips.missing', { count: service.missingComparable })}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
