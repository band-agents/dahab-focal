import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import { Button, Mark } from '@dahab/ui';

import { SORT_KEYS, SORT_MARKS } from '../../src/discover-data';

/** The sort sheet — same construction as the filter sheet, one selection. */
export default function SortScreen() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<(typeof SORT_KEYS)[number]>('earliest');

  return (
    <View className="flex-1 bg-cream-50">
      <View className="items-center pt-3">
        <View className="h-1 w-10 rounded-pill bg-border-strong" />
      </View>
      <Text className="px-5 pt-4 font-display text-h2 text-text">{t('traveler.sort.title')}</Text>
      <ScrollView contentContainerClassName="px-5 pb-4 pt-2">
        {SORT_KEYS.map((key) => {
          const on = key === selected;
          return (
            <Pressable
              key={key}
              onPress={() => setSelected(key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              className={`min-h-11 flex-row items-center gap-3 rounded-input border px-3 py-3 ${
                on ? 'border-border-strong bg-mint-50' : 'border-transparent'
              }`}
            >
              <Mark name={SORT_MARKS[key]} size={24} />
              <Text className="flex-1 font-ui text-body text-text">{t(`traveler.sort.${key}`)}</Text>
              <View
                className={`h-3 w-3 rounded-full border ${on ? 'border-line bg-line' : 'border-border'}`}
              />
            </Pressable>
          );
        })}
      </ScrollView>
      <View className="px-5 pb-10 pt-2">
        <Button variant="primary" block onPress={() => router.back()}>
          {t('action.apply')}
        </Button>
      </View>
    </View>
  );
}
