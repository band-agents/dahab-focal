import type { Route } from 'next';

import type { Locale } from '@dahab/i18n/server';
import type { IconName } from '@/components/console';

/**
 * The console's sections, in one place. This list IS the information
 * architecture.
 *
 * Two things changed when the console stopped being desktop-only.
 *
 * The first is `tab`. A phone gets five slots and no more — a sixth is where
 * thumb reach stops being reliable — so four sections are marked as tabs and
 * everything else is reached through Home, which is a grid of every module the
 * business has rather than a list of the sections that did not fit. The rail
 * above `lg` still shows the sections flat, because a desktop has the room.
 *
 * The second is `people`. The platform had eight screens and not one of them
 * was about a traveller: `users`, `user_profiles`, `certifications`,
 * `medical_info` and `emergency_contacts` all existed in the schema with no
 * query reading any of them. An operator can be suspended and a booking can be
 * refunded, but the person those things happen to had no page.
 */
export interface Section {
  readonly key: string;
  /** Path under the locale segment. Empty string is the index. */
  readonly path: string;
  readonly icon: IconName;
  /** The i18n key for the label, so nothing here is a user-visible string. */
  readonly labelKey: string;
  /** One of the five the phone tab bar carries. */
  readonly tab?: true;
}

export const SECTIONS: readonly Section[] = [
  { key: 'home', path: 'home', icon: 'home', labelKey: 'admin.nav.home', tab: true },
  { key: 'today', path: '', icon: 'today', labelKey: 'admin.nav.today', tab: true },
  { key: 'vendors', path: 'vendors', icon: 'operators', labelKey: 'admin.nav.vendors', tab: true },
  { key: 'people', path: 'people', icon: 'people', labelKey: 'admin.nav.people', tab: true },
  { key: 'money', path: 'money', icon: 'money', labelKey: 'admin.nav.money', tab: true },
  { key: 'expiry', path: 'expiry', icon: 'clock', labelKey: 'admin.nav.expiry' },
  { key: 'catalog', path: 'catalog', icon: 'tank', labelKey: 'admin.nav.catalog' },
  { key: 'pricing', path: 'pricing', icon: 'tag', labelKey: 'admin.nav.pricing' },
  { key: 'bookings', path: 'bookings', icon: 'boat', labelKey: 'admin.nav.bookings' },
  { key: 'trust', path: 'trust', icon: 'shield', labelKey: 'admin.nav.trust' },
  { key: 'platform', path: 'platform', icon: 'filter', labelKey: 'admin.nav.platform' },
];

/**
 * The five keys the tab bar renders, in order. Derived rather than written
 * twice, and asserted so a sixth `tab: true` fails a test rather than quietly
 * producing a cramped bar on a 360px phone.
 */
export const TAB_KEYS: readonly string[] = SECTIONS.filter(
  (section) => section.tab === true,
).map((section) => section.key);

/**
 * The route for a section named by key, for links that are not the rail.
 *
 * A stat on one screen points at another section, and pointing at it by key
 * rather than by a hand-written path means a moved section moves both.
 */
export function sectionHref(locale: Locale, key: string): Route {
  const section = SECTIONS.find((candidate) => candidate.key === key);
  if (section === undefined) throw new Error(`No console section named "${key}"`);
  return hrefFor(locale, section);
}

export function hrefFor(locale: Locale, section: Section): Route {
  return path(locale, section.path);
}

/**
 * A path under the current locale. Every link in the console goes through
 * here or through `sectionHref`, so the locale segment is never concatenated
 * by hand — that is how a link ends up dropping someone from ar-EG into
 * en-GB mid-task.
 */
export function path(locale: Locale, rest: string): Route {
  const href = rest === '' ? `/${locale}` : `/${locale}/${rest}`;
  // typedRoutes cannot see through the locale segment; the paths come from the
  // closed SECTIONS list above and from detail routes that exist.
  return href as Route;
}

/**
 * A neighbourhood slug as its i18n key.
 *
 * `vendors.neighborhood` stores a slug — 'blue-beach' — and rendering that
 * straight to the screen is what the roster and the operator page were both
 * doing. Derived here rather than joined, for the same reason the dive-site
 * key is: the column is a slug, not a foreign key, and a vendor can sit in an
 * area the list does not know about.
 */
export function neighborhoodKey(slug: string): string {
  // Two areas are filed as `eel-garden-quarter` and `lighthouse-quarter` so
  // their slugs cannot collide with the dive sites of the same name; the
  // catalogue names the area without the suffix. Without this, an operator
  // placed in either rendered as the raw key `neighborhood.eelGardenQuarter`.
  const camel = slug
    .replace(/-quarter$/, '')
    .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
  return `neighborhood.${camel}`;
}
