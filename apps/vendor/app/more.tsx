import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatCurrency, formatDate, isolate, money } from '@dahab/i18n';
import { Card, Illo, Mark, Row, StatusPill } from '@dahab/ui';

import { EARNINGS, RESOURCES, STAFF } from '../src/operations';
import { isOwner, session } from '../src/session';

/**
 * V05–V07 · Team, equipment and money, gated by role.
 *
 * This screen is where the owner/staff split is most visible: a guide reaching
 * it sees equipment and nothing else, because `vendorStaff` holds
 * `resource.manage` but neither `staff.manage` nor `payout.readOwn`.
 *
 * The two expiries here are not warnings, they are refusals. A lapsed
 * instructor rating cannot be assigned as guide and the calendar says so; a
 * cylinder inside its hydrostatic window cannot go on a manifest. Surfacing
 * them before they bite is the whole point of the vendor model.
 */
export default function MoreScreen() {
  const { t } = useTranslation();
  const context = { locale: session.locale } as const;
  const owner = isOwner(session.role);

  const cash = (amount: { amountMinor: number; currency: 'EGP' }) =>
    formatCurrency(money(amount.amountMinor, amount.currency), context);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-6 px-5 pb-16 pt-14">
      <View>
        <Text className="font-display text-displayL text-text">{t('vendor.more.title')}</Text>
        <Text className="mt-1 font-ui text-body text-text-muted">
          {session.vendorName} · {t(owner ? 'vendor.role.owner' : 'vendor.role.staff')}
        </Text>
      </View>

      {owner ? (
        <Card
          mark="shell"
          title={t('vendor.more.money')}
          eyebrow={t('vendor.more.ownerOnly')}
        >
          <Text className="font-ui text-small text-text-muted">{t('vendor.more.moneySub')}</Text>
          <View className="mt-4 gap-2">
            {[
              { key: 'gross', label: t('admin.money.gross'), value: cash(EARNINGS.gross) },
              { key: 'commission', label: t('admin.money.commission'), value: cash(EARNINGS.commission) },
              { key: 'fees', label: t('admin.money.fees'), value: cash(EARNINGS.fees) },
              { key: 'net', label: t('admin.money.net'), value: cash(EARNINGS.net) },
            ].map((line) => (
              <View
                key={line.key}
                className="flex-row items-baseline justify-between rounded-sm bg-bg px-3 py-2"
              >
                <Text className="font-ui text-body text-text">{line.label}</Text>
                <Text className="font-display text-body tabular-nums text-text">{line.value}</Text>
              </View>
            ))}
          </View>
          <Text className="mt-3 font-ui text-small text-text-muted">
            {t('vendor.more.nextPayout', {
              date: isolate(formatDate(new Date(`${EARNINGS.nextPayout}T00:00:00Z`), context, 'date')),
            })}
          </Text>
        </Card>
      ) : null}

      {owner ? (
        <Card mark="diver" title={t('vendor.more.staff')} eyebrow={t('vendor.more.ownerOnly')}>
          <Text className="font-ui text-small text-text-muted">{t('vendor.more.staffSub')}</Text>
          <View className="mt-3">
            {STAFF.map((member) => (
              <Row
                key={member.id}
                title={isolate(member.name)}
                detail={isolate(member.rating)}
                meta={t('vendor.more.dueOn', {
                  date: isolate(
                    formatDate(new Date(`${member.expiresOn}T00:00:00Z`), context, 'date'),
                  ),
                })}
                mark="mask"
                trailing={
                  member.lapsed ? (
                    <StatusPill tone="danger" mark="sos">
                      {t('vendor.more.lapsed')}
                    </StatusPill>
                  ) : (
                    <StatusPill tone="success" mark="eco">
                      {t('status.verified')}
                    </StatusPill>
                  )
                }
              />
            ))}
          </View>
        </Card>
      ) : null}

      {/* `resource.manage` is in vendorStaff, so a guide sees this one. */}
      <Card mark="tank" title={t('vendor.more.resources')}>
        <Text className="font-ui text-small text-text-muted">{t('vendor.more.resourcesSub')}</Text>
        <View className="mt-3">
          {RESOURCES.map((resource) => (
            <Row
              key={resource.id}
              title={isolate(resource.label)}
              meta={t('vendor.more.dueOn', {
                date: isolate(formatDate(new Date(`${resource.dueOn}T00:00:00Z`), context, 'date')),
              })}
              mark="tank"
              trailing={
                resource.blocked ? (
                  <StatusPill tone="danger" mark="sos">
                    {t('vendor.more.blocked')}
                  </StatusPill>
                ) : (
                  <StatusPill tone="success" mark="eco">
                    {t('status.verified')}
                  </StatusPill>
                )
              }
            />
          ))}
        </View>
      </Card>

      {owner ? null : (
        <View className="items-center gap-3 py-6">
          <Illo name="seaTurtle" size={72} />
          <View className="flex-row items-start gap-3 rounded-lg bg-info-surface p-4">
            <Mark name="chat" size={20} />
            <Text className="flex-1 font-ui text-small text-info-text">
              {t('vendor.role.staffLimit', { name: isolate('Mahmoud') })}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
