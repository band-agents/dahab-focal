import { LOCALES, SOURCE_LOCALE, directionOf, isLocale, type Locale } from '@dahab/i18n';
import type { Direction, ThemeName } from '@dahab/ui';

/**
 * The gallery's render configuration, read once from the URL.
 *
 * `scripts/shoot.mjs` drives the four required screenshots by loading
 * `?theme=&dir=&locale=`. Until this module existed nothing read those
 * parameters, so all four shots were the same light-LTR-English render filed
 * under four names — a verification gate that could only ever pass.
 *
 * Read at module scope rather than in a hook, so the very first paint is
 * already in the right theme, direction and language and a screenshot cannot
 * catch an intermediate state.
 */

export interface GalleryConfig {
  readonly theme: ThemeName;
  readonly direction: Direction;
  readonly locale: Locale;
  /** True when the direction was forced rather than derived from the locale. */
  readonly directionForced: boolean;
}

const THEMES: readonly ThemeName[] = ['light', 'dark'];
const DIRECTIONS: readonly Direction[] = ['ltr', 'rtl'];

function search(): URLSearchParams {
  if (typeof window === 'undefined' || typeof window.location === 'undefined') {
    return new URLSearchParams();
  }
  return new URLSearchParams(window.location.search);
}

/**
 * An unrecognised value is a typo in the harness, not a user choice, so it
 * falls back loudly rather than silently: the console line is what tells you
 * `?theme=night-dive` did nothing.
 */
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
    console.warn(
      `gallery: ?${key}=${raw} is not one of ${allowed.join(' | ')} — using ${fallback}.`,
    );
    return fallback;
  }
  return match;
}

export function readConfig(): GalleryConfig {
  const params = search();

  const theme = pick(params, 'theme', THEMES, 'light');

  const rawLocale = params.get('locale');
  const locale: Locale =
    rawLocale === null ? SOURCE_LOCALE : isLocale(rawLocale) ? rawLocale : fallbackLocale(rawLocale);

  // Direction normally follows the locale — ar-EG is RTL and that is not a
  // separate decision. The parameter exists so the harness can also shoot a
  // deliberately-mirrored English screen, which is how you catch a component
  // that only looks right because Arabic is short.
  const rawDirection = params.get('dir');
  const directionForced = rawDirection !== null;
  const direction = directionForced
    ? pick(params, 'dir', DIRECTIONS, directionOf(locale))
    : directionOf(locale);

  return { theme, direction, locale, directionForced };
}

function fallbackLocale(raw: string): Locale {
  console.warn(`gallery: ?locale=${raw} is not one of ${LOCALES.join(' | ')} — using en-GB.`);
  return SOURCE_LOCALE;
}

export const config: GalleryConfig = readConfig();
