import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import { isolate } from '@dahab/i18n';
import { Button, Row } from '@dahab/ui';

import { FILTER_ROWS } from '../../src/discover-data';

/**
 * The filter sheet. Board 04: "cream-50 ground, grab handle, big rows, one
 * primary button pinned at the bottom." There is nothing to actually filter
 * against yet — the rows are the six read from the design, applying them is
 * a no-op that just closes the sheet.
 */
export default function FiltersScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-cream-50">
      <View className="items-center pt-3">
        <View className="h-1 w-10 rounded-pill bg-border-strong" />
      </View>
      <View className="flex-row items-center justify-between px-5 pt-4">
        <Text className="font-display text-h2 text-text">{t('traveler.filters.title')}</Text>
        <Button variant="ghost" onPress={() => router.back()}>
          {t('traveler.filters.clearAll')}
        </Button>
      </View>
      <ScrollView contentContainerClassName="px-5 pb-4 pt-2">
        {FILTER_ROWS.map((row) => (
          <Row
            key={row.key}
            title={t(`traveler.filterField.${row.key}`)}
            meta={isolate(row.value)}
            mark={row.mark}
          />
        ))}
      </ScrollView>
      <View className="px-5 pb-10 pt-2">
        <Button variant="primary" block onPress={() => router.back()}>
          {t('action.apply')}
        </Button>
      </View>
    </View>
  );
}
