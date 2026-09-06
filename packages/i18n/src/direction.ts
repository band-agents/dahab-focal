/**
 * Direction as a first-class piece of app state.
 *
 * Nothing in the app reads `I18nManager.isRTL` directly and nothing branches
 * on `locale === 'ar-EG'`. Both are the same question asked badly: the answer
 * is `useDirection()`.
 */

import { useTranslation } from 'react-i18next';

import { LOCALE_DESCRIPTORS, resolveLocale, type Direction, type Locale } from './locales';

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

/**
 * Pick between a start-side and end-side value without writing a ternary on
 * direction at every call site. Reads better than `isRtl ? b : a` and cannot
 * be got backwards.
 */
export function byDirection<T>(direction: Direction, values: { ltr: T; rtl: T }): T {
  return direction === 'rtl' ? values.rtl : values.ltr;
}

/**
 * The sign a translate/rotate animation should carry so that "forward" means
 * "towards the end edge" in both directions. A drawer that slides in from the
 * start edge slides from the left in English and from the right in Arabic.
 */
export function directionSign(direction: Direction): 1 | -1 {
  return direction === 'rtl' ? -1 : 1;
}

/**
 * Icons that depict a physical object, a brand, or a media transport control
 * must not mirror: a camera is still a camera in Arabic, and a play triangle
 * still points at the timeline's future. Everything that encodes *direction of
 * travel through the interface* — chevrons, back arrows, progress, undo —
 * does mirror.
 *
 * The rule is applied by the Icon primitive; this is the shared predicate so
 * the gallery and the tests agree with it.
 */
export function shouldMirrorIcon(direction: Direction, noFlip: boolean): boolean {
  return direction === 'rtl' && !noFlip;
}

/** The `dir` attribute value for a web root or an isolated subtree. */
export function htmlDir(direction: Direction): 'ltr' | 'rtl' {
  return direction;
}
