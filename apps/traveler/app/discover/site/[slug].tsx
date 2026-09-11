import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';

import { isolate } from '@dahab/i18n';
import { Button, Illo, StatusPill } from '@dahab/ui';

import { BackRow } from '../../../src/BackRow';
import { BLUE_HOLE } from '../../../src/discover-data';

/**
 * The dive-site sheet. Only Blue Hole is wired — the one site Board 04 drew
 * in full, depth profile and Arch gate included. Any other slug gets an
 * honest not-built state rather than a fabricated site.
 */
export default function SiteSheetScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useTranslation();

  if (slug !== BLUE_HOLE.slug) {
    return (
      <ScrollView className="flex-1 bg-bg" contentContainerClassName="pb-16">
        <BackRow title={t('traveler.notBuilt.title')} />
        <View className="items-center gap-3 px-8 py-10">
          <Illo name="coralFan" size={96} />
          <Text className="text-center font-ui text-body text-text-muted">
            {t('traveler.notBuilt.body')}
          </Text>
        </View>
      </ScrollView>
    );
  }

  const site = BLUE_HOLE;
  const pct = (m: number): `${number}%` => `${Math.min(100, (m / site.floorM) * 100)}%`;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-6 pb-16">
      <BackRow title={site.name} />

      <View className="px-5">
        <Text className="font-ui text-body text-text-muted">{isolate(site.meta)}</Text>
        <Text className="mt-3 font-ui text-body text-text">{isolate(site.body)}</Text>
      </View>

      <View className="px-5">
        <Text className="mb-3 font-ui text-overline uppercase text-text-muted">
          {t('traveler.site.depthProfile')}
        </Text>
        <View className="h-48 rounded-card bg-shape-water p-4">
          <View className="relative h-full flex-1">
            {(
              [
                { m: site.saddleM, label: t('traveler.site.saddle') },
                { m: site.archM, label: t('traveler.site.arch') },
                { m: site.floorM, label: t('traveler.site.floor') },
              ] as const
            ).map((marker) => (
              <View
                key={marker.label}
                style={{ top: pct(marker.m) }}
                className="absolute start-0 end-0 flex-row items-center gap-2"
              >
                <View className="h-px flex-1 bg-line" />
                <Text className="font-ui text-small text-text">
                  {marker.label} · {t('traveler.site.meters', { value: marker.m })}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className="gap-2 px-5">
        {site.facts.map((fact) => (
          <View key={fact.text} className="flex-row items-center gap-3">
            <StatusPill tone="info" mark={fact.mark}>
              {isolate(fact.text)}
            </StatusPill>
          </View>
        ))}
      </View>

      <View className="mx-5 gap-3 rounded-card bg-danger-surface p-4">
        <Text className="font-display text-h3 text-danger-text">
          {t('traveler.site.gateTitle', { name: site.name })}
        </Text>
        <Text className="font-ui text-small text-danger-text">
          {t('traveler.site.gateBody', {
            certification: isolate(site.certification),
            dives: site.loggedDives,
            name: site.name,
          })}
        </Text>
        <Button variant="secondary">{t('traveler.site.gateCta')}</Button>
      </View>

      <View className="mx-5 flex-row items-center justify-between rounded-card bg-surface p-4">
        <Text className="font-ui text-body text-text">{t('traveler.site.tripsHere', { count: site.tripsHere })}</Text>
        <Button variant="primary">{t('traveler.site.seeTrips')}</Button>
      </View>
    </ScrollView>
  );
}
