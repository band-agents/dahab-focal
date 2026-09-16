import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatDate, isolate } from '@dahab/i18n';
import { Mark } from '@dahab/ui';

import { STALE_AFTER_MS } from './cache';
import { useSession } from './SessionProvider';

/**
 * "This is what the phone had, and when."
 *
 * Shown above any screen rendering a cached answer. The rule it enforces is
 * the whole reason the cache records a timestamp: a manifest from yesterday
 * morning must not look like a manifest from four seconds ago. A guide acting
 * on a stale list leaves somebody standing on the shore.
 *
 * Two shades of it, because the difference matters at the dock. Inside the
 * freshness window it is a quiet note on the info ground; past it, a warning.
 */
export function Stale({ at }: { readonly at: number }) {
  const { t } = useTranslation();
  const session = useSession();
  const context = { locale: session.locale } as const;

  const old = Date.now() - at > STALE_AFTER_MS;

  return (
    <View
      accessibilityRole="alert"
      className={`flex-row items-start gap-3 rounded-lg p-4 ${
        old ? 'bg-warning-surface' : 'bg-info-surface'
      }`}
    >
      <Mark name="offline" size={20} noFlip />
      <Text className={`flex-1 font-ui text-small ${old ? 'text-warning-text' : 'text-info-text'}`}>
        {t('vendor.offline.showing', {
          // A time inside an Arabic sentence reorders without this — the same
          // bidi bug that put "6 kt" at the wrong end of a line twice before.
          when: isolate(formatDate(new Date(at), context, 'dateTime')),
        })}
      </Text>
    </View>
  );
}
