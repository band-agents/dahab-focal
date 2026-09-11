import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { formatCurrency, isolate, money } from '@dahab/i18n';
import { Button, Card, CategoryMark, Mark, Row } from '@dahab/ui';

import {
  CATEGORY_ORDER,
  COMPARE_ATTRIBUTE_COUNT,
  DIVING_TRIPS,
  PARSED_QUERY,
  RECENT_SEARCHES,
} from '../../src/discover-data';
import { session } from '../../src/session';

/**
 * Board 04 · Discover — search, recents, categories, then results as a list
 * or an abstract map.
 *
 * There is no real query parser or search API yet (HANDOVER.md §10): running
 * any search lands on the same worked example the design board specifies
 * ("two calm shore dives near Masbat…"). That is fixture behaviour, the same
 * honesty the admin and vendor screens already practise — real numbers,
 * proven against no backend.
 */
export default function DiscoverScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const context = { locale: session.locale } as const;

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'idle' | 'results'>('idle');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [chipIds, setChipIds] = useState<readonly number[]>(PARSED_QUERY.chips.map((_, i) => i));
  const [comparing, setComparing] = useState<ReadonlySet<string>>(
    new Set(DIVING_TRIPS.filter((trip) => trip.comparing).map((trip) => trip.id)),
  );

  function runSearch(text: string) {
    setQuery(text);
    setChipIds(PARSED_QUERY.chips.map((_, i) => i));
    setMode('results');
  }

  function removeChip(id: number) {
    setChipIds((ids) => ids.filter((existing) => existing !== id));
  }

  function toggleCompare(id: string) {
    setComparing((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const cash = (minor: number, currency: 'EGP' | 'EUR') =>
    isolate(formatCurrency(money(minor, currency), context, { trimZeroFraction: true }));

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-6 px-5 pb-16 pt-14">
      <Text className="font-display text-displayL text-text">{t('traveler.discover.title')}</Text>

      <View className="flex-row items-center gap-3 rounded-input border border-border bg-surface px-4 py-3">
        <Mark name="compass" size={20} noFlip />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => runSearch(query.trim().length > 0 ? query : PARSED_QUERY.text)}
          placeholder={t('traveler.discover.searchPlaceholder')}
          returnKeyType="search"
          className="flex-1 font-ui text-body text-text"
        />
      </View>

      {mode === 'idle' ? (
        <>
          <View>
            <Text className="mb-2 font-ui text-overline uppercase text-text-muted">
              {t('traveler.discover.recent')}
            </Text>
            {RECENT_SEARCHES.map((recent) => (
              <Pressable key={recent.id} onPress={() => runSearch(recent.query)}>
                <Row
                  title={isolate(recent.query)}
                  meta={t('traveler.discover.resultsMatch', { count: recent.resultCount })}
                  mark={recent.mark}
                />
              </Pressable>
            ))}
          </View>

          <View>
            <Text className="mb-3 font-ui text-overline uppercase text-text-muted">
              {t('traveler.discover.categories')}
            </Text>
            <View className="flex-row flex-wrap gap-4">
              {CATEGORY_ORDER.map((slug) => (
                <Pressable
                  key={slug}
                  onPress={() => router.push({ pathname: '/discover/category/[slug]', params: { slug } })}
                  className="w-24 items-center gap-2"
                >
                  <View className="rounded-card bg-surface p-3">
                    <CategoryMark name={slug} size={40} />
                  </View>
                  <Text className="text-center font-ui text-small text-text" numberOfLines={2}>
                    {t(`category.${slug}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      ) : (
        <>
          <View className="gap-3 rounded-card bg-surface p-4">
            <Text className="font-ui text-overline uppercase text-text-muted">
              {t('traveler.discover.parsedAs')}
            </Text>
            <Text className="font-ui text-body text-text">{isolate(query || PARSED_QUERY.text)}</Text>
            <View className="flex-row flex-wrap gap-2">
              {chipIds.map((id) => {
                const chip = PARSED_QUERY.chips[id];
                if (chip === undefined) return null;
                return (
                  <View
                    key={id}
                    className="flex-row items-center gap-2 rounded-pill border border-border-strong bg-bg ps-3 pe-2 py-1"
                  >
                    <Text className="font-ui text-small text-text">
                      {t(`traveler.discover.chipKind.${chip.kind}`)}: {isolate(chip.value)}
                    </Text>
                    <Pressable
                      onPress={() => removeChip(id)}
                      accessibilityLabel={t('action.remove')}
                      hitSlop={8}
                    >
                      <Text className="font-ui text-small text-text-muted">×</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
            <Text className="mt-1 font-ui text-overline uppercase text-text-muted">
              {t('traveler.discover.notUsedYet')}
            </Text>
            {PARSED_QUERY.unparsed.map((key) => (
              <Text key={key} className="font-ui text-small text-text-muted">
                {t(`traveler.discover.${key}`)}
              </Text>
            ))}
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="font-ui text-body text-text">
              {t('traveler.discover.resultsMatch', { count: DIVING_TRIPS.length })}
            </Text>
            <View className="flex-row gap-2">
              <Button
                variant={viewMode === 'list' ? 'primary' : 'secondary'}
                onPress={() => setViewMode('list')}
              >
                {t('traveler.discover.listView')}
              </Button>
              <Button
                variant={viewMode === 'map' ? 'primary' : 'secondary'}
                onPress={() => setViewMode('map')}
              >
                {t('traveler.discover.mapView')}
              </Button>
            </View>
          </View>

          <View className="flex-row gap-2">
            <Button variant="secondary" mark="pass" onPress={() => router.push('/discover/filters')}>
              {t('action.filter')}
            </Button>
            <Button variant="secondary" mark="sun" onPress={() => router.push('/discover/sort')}>
              {t('traveler.sort.title')}
            </Button>
            <Button variant="ghost" mark="chat" onPress={() => router.push('/discover/ask')}>
              {t('traveler.discover.askBahri')}
            </Button>
          </View>

          {viewMode === 'list' ? (
            <View className="gap-3">
              {DIVING_TRIPS.map((trip) => {
                const isComparing = comparing.has(trip.id);
                return (
                  <Card key={trip.id} mark={trip.mark} title={trip.title} eyebrow={isolate(trip.operator)}>
                    <Text className="font-ui text-small text-text-muted">
                      {isolate(trip.meta)} · <Mark name="star" size={14} noFlip /> {trip.rating}
                    </Text>
                    <View className="mt-3 flex-row items-end justify-between">
                      <View>
                        <Text className="font-display text-h2 text-text">
                          {cash(trip.priceEGPMinor, 'EGP')}
                        </Text>
                        <Text className="font-ui text-small text-text-muted">
                          ≈ {cash(trip.priceEURMinor, 'EUR')}
                        </Text>
                      </View>
                      <Button
                        variant={isComparing ? 'primary' : 'secondary'}
                        onPress={() => toggleCompare(trip.id)}
                      >
                        {(isComparing ? '✓ ' : '+ ') + t('traveler.discover.compare')}
                      </Button>
                    </View>
                  </Card>
                );
              })}
              <Pressable
                onPress={() => router.push({ pathname: '/discover/category/[slug]', params: { slug: 'diving' } })}
              >
                <Text className="text-center font-ui text-body text-text-link">
                  {t('traveler.discover.compareCategoryCount', {
                    category: t('category.diving'),
                    attributes: t('traveler.discover.compareCount', { count: COMPARE_ATTRIBUTE_COUNT }),
                  })}
                </Text>
              </Pressable>
            </View>
          ) : (
            // The map layer stays physically LTR in every locale — Dahab's coast
            // runs water-east, land-west, and that is a geographic fact, not a
            // layout the bidi algorithm should touch (DESIGN-PROMPT-BOARDS-04-11.md).
            <View
              style={{ direction: 'ltr' }}
              className="h-72 flex-row overflow-hidden rounded-card border border-border"
            >
              <View className="w-2/5 bg-shape-land" />
              <View className="flex-1 bg-shape-water" />
              {DIVING_TRIPS.map((trip) => (
                <View
                  key={trip.id}
                  style={{ position: 'absolute', left: trip.pin.x, top: trip.pin.y }}
                  className="-ml-5 -mt-5 items-center"
                >
                  <View className="rounded-full bg-cta-fill p-2">
                    <Mark name={trip.mark} size={20} noFlip />
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
