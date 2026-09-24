import { formatCurrency, formatDate, money, type CurrencyCode } from '@dahab/i18n/server';

import { Notice } from '@/components/ui/Bits';
import { Icon, type IconName } from '@/components/ui/Icon';
import { api, load } from '@/lib/api';
import { getMe } from '@/lib/data';
import { translator } from '@/lib/i18n';
import { Heading, resolveLocale } from '@/lib/page';

/**
 * Money: the last 30 days, as the sum a bank transfer will actually be.
 *
 * The big number is what reaches the operator, not the gross — "you made
 * 40,000" followed by a transfer of 34,000 reads as money going missing. The
 * lines under it show where the difference went, each named plainly.
 * Owner-only, like the API: a team member is told, not refused.
 */
export default async function MoneyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale };

  const me = await getMe();
  if (!me.ok) return null;
  if (!me.data.isOwner) {
    return (
      <div className="flex flex-col gap-5">
        <Heading title={t('partner.money.title')} subtitle={t('partner.money.subtitle')} />
        <Notice tone="info" title={t('partner.money.ownerOnly')} />
      </div>
    );
  }

  const earnings = await load(() => api.vendor.earnings.query({ days: 30 }));
  const show = (value: { readonly amountMinor: number; readonly currency: CurrencyCode }) =>
    formatCurrency(money(value.amountMinor, value.currency), context, { trimZeroFraction: true });

  if (!earnings.ok) {
    return (
      <div className="flex flex-col gap-5">
        <Heading title={t('partner.money.title')} subtitle={t('partner.money.subtitle')} />
        <Notice tone="danger" title={t('partner.common.unreachable')} />
      </div>
    );
  }
  const e = earnings.data;

  const lines: readonly { readonly key: string; readonly icon: IconName; readonly value: typeof e.gross; readonly minus: boolean }[] = [
    { key: 'gross', icon: 'money', value: e.gross, minus: false },
    { key: 'commission', icon: 'tag', value: e.commission, minus: true },
    { key: 'fees', icon: 'exchange', value: e.fees, minus: true },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Heading title={t('partner.money.title')} subtitle={t('partner.money.subtitle')} />

      <section className="rounded-lg bg-c-accent p-6 text-c-on-accent">
        <p className="text-body font-semibold opacity-90">{t('partner.money.net')}</p>
        <p className="mt-1 text-displayXL font-semibold tabular-nums">{show(e.net)}</p>
        <p className="mt-2 text-body opacity-90">
          {t('partner.money.period', {
            from: formatDate(new Date(`${e.fromDay}T12:00:00Z`), context, 'date'),
            to: formatDate(new Date(`${e.toDay}T12:00:00Z`), context, 'date'),
          })}
        </p>
      </section>

      <section className="rounded-lg border border-c-edge bg-c-surface">
        {lines.map((line) => (
          <div key={line.key} className="flex items-center gap-4 border-b border-c-edge px-5 py-4 last:border-b-0">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-c-raised text-c-muted">
              <Icon name={line.icon} size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-bodyL font-semibold text-c-text">{t(`partner.money.${line.key}`)}</span>
              <span className="block text-small text-c-muted">{t(`partner.money.${line.key}Hint`)}</span>
            </span>
            <span className={`shrink-0 text-bodyL font-semibold tabular-nums ${line.minus ? 'text-c-muted' : 'text-c-text'}`}>
              {line.minus ? '− ' : ''}
              {show(line.value)}
            </span>
          </div>
        ))}
      </section>

      <Notice
        tone={e.nextPayoutOn === null ? 'info' : 'success'}
        title={
          e.nextPayoutOn === null
            ? t('partner.money.noPayout')
            : t('partner.money.nextPayout', {
                date: formatDate(new Date(`${e.nextPayoutOn}T12:00:00Z`), context, 'date'),
              })
        }
      />
    </div>
  );
}
