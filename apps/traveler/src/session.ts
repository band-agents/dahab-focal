import { SOURCE_LOCALE, directionOf, isLocale, type Locale } from '@dahab/i18n';
import type { Direction, Script, ThemeName } from '@dahab/ui';

/**
 * Who is holding the phone, and in what language.
 *
 * Unlike the vendor app, there is no role split here — every visitor is a
 * traveller until they sign in, and there is no auth yet (HANDOVER.md §10).
 * Read from the URL at module scope so the first paint is already correct,
 * the same way the gallery and the vendor app do it.
 */

export interface TravelerSession {
  readonly theme: ThemeName;
  readonly locale: Locale;
  readonly direction: Direction;
  readonly script: Script;
}

const THEMES: readonly ThemeName[] = ['light', 'dark'];

function search(): URLSearchParams {
  if (typeof window === 'undefined' || typeof window.location === 'undefined') {
    return new URLSearchParams();
  }
  return new URLSearchParams(window.location.search);
}

function pick<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const match = allowed.find((candidate) => candidate === raw);
  if (match === undefined) {
    console.warn(`traveler: ?${key}=${raw} is not one of ${allowed.join(' | ')} — using ${fallback}.`);
    return fallback;
  }
  return match;
}

function readSession(): TravelerSession {
  const params = search();
  const theme = pick(params, 'theme', THEMES, 'light');

  const rawLocale = params.get('locale');
  const locale: Locale =
    rawLocale === null ? SOURCE_LOCALE : isLocale(rawLocale) ? rawLocale : SOURCE_LOCALE;

  return {
    theme,
    locale,
    direction: directionOf(locale),
    script: locale === 'ar-EG' ? 'arabic' : 'latin',
  };
}

export const session: TravelerSession = readSession();
