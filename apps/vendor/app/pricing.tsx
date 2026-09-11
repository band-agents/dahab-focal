import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatCurrency, formatNumber, isolate, money } from '@dahab/i18n';
import type { CurrencyCode } from '@dahab/i18n';
import { Button, Card, Mark, StatusPill } from '@dahab/ui';

import { PRESETS, rulesInPriorityOrder, simulate } from '../src/pricing';
import { isOwner, session } from '../src/session';

/**
 * V04 · Pricing, and the simulator.
 *
 * Owner only: `pricing.manage` is not in vendorStaff.
 *
 * The simulator calls `computePrice()` from @dahab/api-contract — the same
 * function the traveller checkout and the comparison engine call. What an
 * operator sees here is therefore what a traveller will be charged, and there
 * is no second implementation to drift.
 *
 * Priority order is shown because it is the operator's own choice and it
 * changes the answer: 10% off then a 300 EGP voucher is a different total from
 * the reverse. A pricing screen that hides the order hides the difference.
 */
export default function PricingScreen() {
  const { t } = useTranslation();
  const context = { locale: session.locale } as const;
  const owner = isOwner(session.role);
  const [presetKey, setPresetKey] = useState(PRESETS[0]?.key ?? 'twoAdults');

  if (!owner) {
    return (
      <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-6 px-5 pb-16 pt-14">
        <Text className="font-display text-displayL text-text">{t('vendor.pricing.title')}</Text>
        <View className="flex-row items-start gap-3 rounded-lg bg-info-surface p-4">
          <Mark name="chat" size={20} />
          <Text className="flex-1 font-ui text-small text-info-text">
            {t('vendor.role.staffLimit', { name: isolate('Mahmoud') })}
          </Text>
        </View>
      </ScrollView>
    );
  }

  const preset = PRESETS.find((candidate) => candidate.key === presetKey) ?? PRESETS[0];
  const breakdown = preset === undefined ? null : simulate(preset.party);
  const cash = (value: { amount: number; currency: CurrencyCode }) =>
    formatCurrency(money(value.amount, value.currency), context);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-6 px-5 pb-16 pt-14">
      <View>
        <Text className="font-display text-displayL text-text">{t('vendor.pricing.title')}</Text>
        <Text className="mt-1 font-ui text-body text-text-muted">
          {t('vendor.pricing.subtitle')}
        </Text>
      </View>

      <Card mark="weave" title={t('vendor.pricing.order')} eyebrow={t('vendor.more.ownerOnly')}>
        <Text className="font-ui text-small text-text-muted">{t('vendor.pricing.orderNote')}</Text>
        <View className="mt-3 gap-2">
          {rulesInPriorityOrder().map((rule, index) => (
            <View
              key={rule.id}
              className="flex-row items-center gap-3 rounded-lg bg-bg px-4 py-3"
            >
              <Text className="font-display text-h3 tabular-nums text-text-muted">
                {formatNumber(index + 1, context)}
              </Text>
              <Text className="flex-1 font-ui text-body text-text">{t(rule.labelKey)}</Text>
              <Mark name="depth" size={20} />
            </View>
          ))}
        </View>
      </Card>

      <Card mark="compass" title={t('vendor.pricing.simulator')}>
        <Text className="font-ui text-small text-text-muted">
          {t('vendor.pricing.simulatorNote')}
        </Text>

        <View className="mt-4 flex-row flex-wrap gap-2">
          {PRESETS.map((candidate) => (
            <Button
              key={candidate.key}
              variant={candidate.key === presetKey ? 'primary' : 'secondary'}
              onPress={() => setPresetKey(candidate.key)}
            >
              {t(`vendor.pricing.preset.${candidate.key}`)}
            </Button>
          ))}
        </View>

        {breakdown === null ? null : (
          <View className="mt-5">
            {/* Itemised in applied order. The breakdown IS the explanation —
                a total with no lines is a number an operator cannot defend. */}
            {breakdown.lines.map((line, index) => (
              <View
                key={`${line.labelKey}-${index}`}
                className="flex-row items-baseline justify-between border-b border-border py-2"
              >
                <Text className="flex-1 font-ui text-body text-text">{t(line.labelKey)}</Text>
                <Text className="font-display text-body tabular-nums text-text">
                  {cash(line.amount)}
                </Text>
              </View>
            ))}

            <View className="mt-3 flex-row items-baseline justify-between">
              <Text className="font-ui text-h3 text-text">{t('vendor.pricing.total')}</Text>
              <Text className="font-display text-h1 tabular-nums text-text">
                {cash(breakdown.total)}
              </Text>
            </View>

            {/* Seats and heads again: the manifest and the invoice disagree by
                design, and the simulator has to say so or an operator will
                think one of them is wrong. */}
            <View className="mt-3 flex-row flex-wrap gap-2">
              <StatusPill tone="neutral" mark="diver">
                {t('vendor.pricing.charged', { count: breakdown.chargeableParty })}
              </StatusPill>
              <StatusPill tone="info" mark="sail">
                {t('vendor.pricing.seated', { count: breakdown.capacityParty })}
              </StatusPill>
            </View>

            {breakdown.suppressedRuleIds.length === 0 ? null : (
              <Text className="mt-3 font-ui text-caption text-text-muted">
                {t('vendor.pricing.suppressed', { count: breakdown.suppressedRuleIds.length })}
              </Text>
            )}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}
