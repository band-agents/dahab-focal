import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Illo } from '@dahab/ui';

/**
 * V02–V07 land here next. The tab exists so the shell is navigable and the
 * role split is visible; the screen itself is deliberately empty rather than
 * filled with placeholder rows that would read as real.
 */
export default function Screen() {
  const { t } = useTranslation();
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-6 px-5 pb-16 pt-14">
      <Text className="font-display text-displayL text-text">{t('vendor.tabs.more')}</Text>
      <View className="items-center gap-4 py-10">
        <Illo name="jellyfish" size={96} />
        <Text className="font-ui text-body text-text-muted">{t('state.emptyBody')}</Text>
      </View>
    </ScrollView>
  );
}
