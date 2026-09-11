import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Illo } from '@dahab/ui';
import type { IlloName } from '@dahab/tokens/marks';

/**
 * The honest placeholder for a tab that is designed but not coded.
 *
 * HANDOVER.md §10: this codebase is deliberately honest about what is real.
 * Discover (Board 04) is the one working tab so far — Home (Board 03) is
 * approved but not built, and Trips/Account (Boards 06–08) were never
 * designed. A blank screen or a crash would be worse than saying so.
 */
export function NotBuilt({ illo }: { readonly illo: IlloName }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-bg px-8">
      <Illo name={illo} size={96} />
      <Text className="text-center font-display text-h2 text-text">
        {t('traveler.notBuilt.title')}
      </Text>
      <Text className="text-center font-ui text-body text-text-muted">
        {t('traveler.notBuilt.body')}
      </Text>
    </View>
  );
}
