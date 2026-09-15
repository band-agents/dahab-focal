import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import { useIsRTL } from '@dahab/ui';

/**
 * The header every pushed Discover screen shares: a back control and a
 * title. There is no native-header component styled to the design system's
 * tokens, so this is drawn in-content — logical direction throughout
 * (CLAUDE.md: never `left`/`right`), including which way the chevron points.
 */
export function BackRow({ title, trailing }: { readonly title: string; readonly trailing?: ReactNode }) {
  const { t } = useTranslation();
  const rtl = useIsRTL();

  return (
    <View className="flex-row items-center gap-3 px-5 pb-3 pt-14">
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t('action.back')}
        hitSlop={8}
        className="min-h-11 min-w-11 items-center justify-center rounded-input"
      >
        <Text className="font-ui text-h2 text-text">{rtl ? '›' : '‹'}</Text>
      </Pressable>
      <Text className="flex-1 font-display text-h2 text-text" numberOfLines={1}>
        {title}
      </Text>
      {trailing === undefined ? null : <View>{trailing}</View>}
    </View>
  );
}
