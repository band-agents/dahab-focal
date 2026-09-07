import { ScrollView, Text, View } from 'react-native';

import {
  formatDualCurrency,
  formatNumber,
  money,
  useTranslation,
  type FormatContext,
} from '@dahab/i18n';
import { useDirection, useDisplayFontClass, useTheme } from '@dahab/ui';

import { config } from '../src/config';

/**
 * Foundations harness.
 *
 * Not a product screen and not the component gallery yet — this is the page
 * that proves the four screenshot configurations actually differ from one
 * another. Every block below changes with theme, direction or locale, and the
 * header states which configuration produced the image so a screenshot cannot
 * be mistaken for another.
 */
export default function GalleryIndex() {
  const { t } = useTranslation();
  const theme = useTheme();
  const direction = useDirection();
  // Baloo 2 for Latin, Baloo Bhaijaan 2 for Arabic. Body stays Rubik either way.
  const display = useDisplayFontClass();

  const format: FormatContext = { locale: config.locale };
  const price = formatDualCurrency(money(145_000, 'EGP'), money(2_700, 'EUR'), format, {
    trimZeroFraction: true,
  });

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="p-6 gap-6">
      {/* Self-labelling, so an image is never ambiguous about what it shows. */}
      <View className="gap-1">
        <Text className="text-overline font-ui text-text-muted uppercase">
          {theme} · {direction} · {config.locale}
        </Text>
        <Text className={`text-displayL ${display} text-text`}>{t('gallery.title')}</Text>
        <Text className="text-body font-ui text-text-muted">{t('gallery.subtitle')}</Text>
      </View>

      {/* Type and brand voice, in the active language. */}
      <View className="gap-2">
        <Text className="text-overline font-ui text-text-muted uppercase">
          {t('gallery.sectionFoundations')}
        </Text>
        <Text className={`text-h2 ${display} text-text`}>{t('app.tagline')}</Text>
        <Text className="text-body font-ui text-text">{t('state.offlineBody')}</Text>
      </View>

      {/* The primary CTA: blush fill, ink label. No white-on-fill exists. */}
      <View className="gap-3">
        <View className="rounded-input bg-cta-fill px-5 py-3 self-start">
          <Text className={`text-h3 ${display} text-cta-label`}>{t('action.confirm')}</Text>
        </View>
        <Text className={`text-bodyL ${display} text-text`}>
          {t('price.perPerson', { price })}
        </Text>
        <Text className="text-body font-ui text-text-muted">
          {t('count.divers', { count: 3 })}
        </Text>
      </View>

      <View className="h-px bg-line" />

      {/*
        The direction proof. Both rows use logical utilities only, so in RTL
        the marker and the rule move to the other edge and the indent flips.
        A physical ml-/pl- here would look identical in both shots — which is
        exactly the bug this screen exists to make visible.
      */}
      <View className="gap-3">
        <Text className="text-overline font-ui text-text-muted uppercase">
          {t('settings.direction')}
        </Text>
        <View className="flex-row items-center">
          <View className="h-4 w-4 rounded-pill bg-cta-fill me-3" />
          <Text className="text-body font-ui text-text">{t('a11y.skipToContent')}</Text>
        </View>
        <View className="border-s-2 border-text-brand ps-4">
          <Text className="text-body font-ui text-text">{t('safety.technicalOnly')}</Text>
        </View>
      </View>

      {/* A raised panel: surface vs bg, and muted text on the raised ground. */}
      <View className="rounded-card bg-surface p-4 gap-2">
        <Text className={`text-h3 ${display} text-text`}>{t('status.confirmed')}</Text>
        <Text className="text-small font-ui text-text-muted">
          {t('count.reviews', { count: 128 })} · {formatNumber(4.8, format)}
        </Text>
        <Text className="text-caption font-ui text-text-link">{t('action.seeMore')}</Text>
      </View>

      {/* Status colours, each paired with a word — never colour alone. */}
      <View className="gap-2">
        <Text className="rounded-sm bg-success-surface px-3 py-2 text-small font-ui text-success-text">
          {t('status.verified')}
        </Text>
        <Text className="rounded-sm bg-warning-surface px-3 py-2 text-small font-ui text-warning-text">
          {t('status.pending')}
        </Text>
        <Text className="rounded-sm bg-danger-surface px-3 py-2 text-small font-ui text-danger-text">
          {t('status.rejected')}
        </Text>
      </View>
    </ScrollView>
  );
}
