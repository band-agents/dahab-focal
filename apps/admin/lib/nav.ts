import type { Route } from 'next';

import type { Locale } from '@dahab/i18n/server';
import type { MarkName } from '@dahab/ui-web';

/**
 * The console's sections, in one place.
 *
 * The rail is the only navigation, so this list IS the information
 * architecture. Marks come from the design system's 37 — none is invented for
 * a menu entry.
 */
export interface Section {
  readonly key: string;
  /** Path under the locale segment. Empty string is the index. */
  readonly path: string;
  readonly mark: MarkName;
  /** The i18n key for the label, so nothing here is a user-visible string. */
  readonly labelKey: string;
}

export const SECTIONS: readonly Section[] = [
  { key: 'today', path: '', mark: 'sun', labelKey: 'admin.nav.today' },
  { key: 'vendors', path: 'vendors', mark: 'compass', labelKey: 'admin.nav.vendors' },
  { key: 'expiry', path: 'expiry', mark: 'firstAid', labelKey: 'admin.nav.expiry' },
  { key: 'catalog', path: 'catalog', mark: 'pass', labelKey: 'admin.nav.catalog' },
  { key: 'bookings', path: 'bookings', mark: 'tank', labelKey: 'admin.nav.bookings' },
  { key: 'money', path: 'money', mark: 'shell', labelKey: 'admin.nav.money' },
  { key: 'trust', path: 'trust', mark: 'chamber', labelKey: 'admin.nav.trust' },
  { key: 'platform', path: 'platform', mark: 'weave', labelKey: 'admin.nav.platform' },
];

/** Sections that have no screen yet, so the rail can say so rather than 404. */
/** Every section now has a screen. Kept so the rail can degrade honestly if
 * one is ever removed or gated behind a flag. */
export const BUILT = new Set(SECTIONS.map((section) => section.key));

/**
 * The route for a section named by key, for links that are not the rail.
 *
 * A "view all" on one screen points at another section, and pointing at it by
 * key rather than by a hand-written path means a moved section moves both.
 */
export function sectionHref(locale: Locale, key: string): Route {
  const section = SECTIONS.find((candidate) => candidate.key === key);
  if (section === undefined) throw new Error(`No console section named "${key}"`);
  return hrefFor(locale, section);
}

export function hrefFor(locale: Locale, section: Section): Route {
  const href = section.path === '' ? `/${locale}` : `/${locale}/${section.path}`;
  // typedRoutes cannot see through the locale segment, but the paths come from
  // the closed SECTIONS list above and BUILT gates the ones that resolve.
  return href as Route;
}
