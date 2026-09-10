/**
 * Direction as a first-class piece of app state.
 *
 * Nothing in the app reads `I18nManager.isRTL` directly and nothing branches
 * on `locale === 'ar-EG'`. Both are the same question asked badly: the answer
 * is `useDirection()`.
 *
 * This module is CLIENT-ONLY — it imports `react-i18next`. The direction
 * helpers that carry no React dependency live in `direction-core.ts` and are
 * re-exported here, so a client component still has one import to reach for
 * while a server component can take the core directly.
 */

import { useTranslation } from 'react-i18next';

import { LOCALE_DESCRIPTORS, resolveLocale, type Direction, type Locale } from './locales';

export {
  byDirection,
  directionSign,
  shouldMirrorIcon,
  htmlDir,
} from './direction-core';

/**
 * The current writing direction, derived from the active i18next language.
 *
 * ```tsx
 * const direction = useDirection();
 * <Chevron noFlip={false} direction={direction} />
 * ```
 */
export function useDirection(): Direction {
  const { i18n } = useTranslation();
  return LOCALE_DESCRIPTORS[resolveLocale(i18n.resolvedLanguage ?? i18n.language)].direction;
}

export function useLocale(): Locale {
  const { i18n } = useTranslation();
  return resolveLocale(i18n.resolvedLanguage ?? i18n.language);
}
