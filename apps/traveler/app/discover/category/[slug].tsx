import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { formatDate, isolate } from '@dahab/i18n';
import { CategoryMark, Illo, Row } from '@dahab/ui';
import type { CategoryMarkName } from '@dahab/tokens/marks';

import { BackRow } from '../../../src/BackRow';
import { HUB } from '../../../src/discover-data';
import { session } from '../../../src/session';

/**
 * The category hub. Board 04 only designed Diving in full — sites this week,
 * operators, the no-fly note. Every other tile routes here honestly: the
 * header and mark are real, the body says plainly that the hub is not built
 * for that category yet, rather than inventing operators or sites for it.
 */
export default function CategoryHubScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const context = { locale: session.locale } as const;

  const categorySlug = (slug ?? 'diving') as CategoryMarkName;
  const title = t(`category.${categorySlug}`);
  const hub = categorySlug === 'diving' ? HUB.diving : undefined;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-6 pb-16">
      <BackRow title={title} />

      <View className="px-5">
        <View className="flex-row items-center gap-4">
          <View className="rounded-card bg-surface p-3">
            <CategoryMark name={categorySlug} size={48} />
          </View>
          {hub === undefined ? null : (
            <Text className="flex-1 font-ui text-body text-text-muted">
              {t('traveler.hub.summary', {
                trips: t('traveler.hub.tripsCount', { count: hub.trips }),
                operators: t('traveler.hub.operatorsCount', { count: hub.operatorCount }),
              })}
            </Text>
          )}
        </View>
      </View>

      {hub === undefined ? (
        <View className="items-center gap-3 px-8 py-10">
          <Illo name="coralFan" size={96} />
          <Text className="text-center font-display text-h2 text-text">
            {t('traveler.notBuilt.title')}
          </Text>
          <Text className="text-center font-ui text-body text-text-muted">
            {t('traveler.notBuilt.body')}
          </Text>
        </View>
      ) : (
        <>
          <View className="flex-row flex-wrap gap-2 px-5">
            {hub.chips.map((chipKey) => (
              <View key={chipKey} className="rounded-pill bg-surface-raised px-3 py-1">
                <Text className="font-ui text-small text-text">
                  {t(`traveler.hub.chip.${chipKey}`)}
                </Text>
              </View>
            ))}
          </View>

          <View className="px-5">
            <Text className="mb-2 font-ui text-overline uppercase text-text-muted">
              {t('traveler.hub.sitesThisWeek')}
            </Text>
            {hub.sites.map((site) => (
              <Pressable
                key={site.name}
                onPress={() =>
                  router.push({ pathname: '/discover/site/[slug]', params: { slug: 'blue-hole' } })
                }
              >
                <Row title={isolate(site.name)} meta={isolate(site.meta)} mark={site.mark} />
              </Pressable>
            ))}
          </View>

          <View className="px-5">
            <Text className="mb-2 font-ui text-overline uppercase text-text-muted">
              {t('traveler.hub.operatorsTitle')}
            </Text>
            {hub.operators.map((op) => (
              <Row key={op.name} title={isolate(op.name)} meta={isolate(op.meta)} mark={op.mark} />
            ))}
          </View>

          <View className="mx-5 flex-row items-start gap-3 rounded-lg bg-info-surface p-4">
            <Text className="flex-1 font-ui text-small text-info-text">
              {t('traveler.hub.noFly', {
                weekday: isolate(formatDate(new Date(hub.noFlyFlight), context, 'weekdayDate')),
                time: isolate(formatDate(new Date(hub.noFlyFlight), context, 'time')),
              })}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}
