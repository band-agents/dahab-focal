import { ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { isolate } from '@dahab/i18n';

import { ASK_BAHRI_SUGGESTIONS, ASK_BAHRI_THREAD } from '../../src/discover-data';
import { BackRow } from '../../src/BackRow';

const SUGGEST_KEY: Record<(typeof ASK_BAHRI_SUGGESTIONS)[number], string> = {
  showBoth: 'suggestShowBoth',
  whatsNotIncluded: 'suggestWhatsNotIncluded',
  freedivingInstead: 'suggestFreedivingInstead',
};

/**
 * Ask Bahri — a worked conversation from Board 04. There is no answer engine
 * behind this yet, so the input is honestly inert: it does not pretend to
 * send a message it cannot answer (HANDOVER.md's fixtures-vs-real rule).
 */
export default function AskBahriScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-bg">
      <BackRow title={t('traveler.ask.title')} />
      <Text className="px-5 pb-2 font-ui text-small text-text-muted">{t('traveler.ask.subtitle')}</Text>

      <ScrollView contentContainerClassName="gap-3 px-5 py-3">
        {ASK_BAHRI_THREAD.map((message, i) => {
          const mine = message.from === 'traveler';
          return (
            <View key={i} className={`max-w-[85%] ${mine ? 'self-end' : 'self-start'}`}>
              <View
                className={`rounded-2xl px-4 py-3 ${mine ? 'bg-cta-fill' : 'border border-border bg-surface'}`}
              >
                <Text className={`font-ui text-body ${mine ? 'text-cta-label' : 'text-text'}`}>
                  {isolate(message.text)}
                </Text>
              </View>
            </View>
          );
        })}

        <View className="flex-row flex-wrap gap-2 pt-2">
          {ASK_BAHRI_SUGGESTIONS.map((key) => (
            <View key={key} className="rounded-pill border border-border-strong bg-bg px-3 py-2">
              <Text className="font-ui text-small text-text">{t(`traveler.ask.${SUGGEST_KEY[key]}`)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="gap-2 border-t border-border px-5 pb-10 pt-3">
        <Text className="font-ui text-small text-text-muted">{t('traveler.ask.notConnected')}</Text>
        <TextInput
          editable={false}
          placeholder={t('traveler.ask.placeholder')}
          className="min-h-11 rounded-input border border-border bg-surface px-4 py-3 font-ui text-body text-text-muted"
        />
      </View>
    </View>
  );
}
