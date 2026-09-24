import type { Route } from 'next';

import type { Locale } from '@dahab/i18n/server';

import type { IconName } from '@/components/ui/Icon';

/**
 * Every destination in the operator dashboard, in one place.
 *
 * The tab bar on a phone carries four of these beside the story button; the
 * rest are on "More", where each one has a sentence saying what it is for.
 */
export interface Destination {
  readonly key: string;
  readonly path: string;
  readonly icon: IconName;
  readonly labelKey: string;
  /** The line under the entry on the "More" page. */
  readonly describedBy?: string;
}

export const DESTINATIONS: readonly Destination[] = [
  { key: 'home', path: '', icon: 'home', labelKey: 'partner.nav.home' },
  { key: 'bookings', path: 'bookings', icon: 'today', labelKey: 'partner.nav.bookings', describedBy: 'partner.more.bookings' },
  { key: 'trips', path: 'trips', icon: 'boat', labelKey: 'partner.nav.trips', describedBy: 'partner.more.trips' },
  { key: 'more', path: 'more', icon: 'more', labelKey: 'partner.nav.more' },
  { key: 'profile', path: 'profile', icon: 'operators', labelKey: 'partner.nav.profile', describedBy: 'partner.more.profile' },
  { key: 'stories', path: 'stories', icon: 'camera', labelKey: 'partner.nav.stories', describedBy: 'partner.more.stories' },
  { key: 'team', path: 'team', icon: 'people', labelKey: 'partner.nav.team', describedBy: 'partner.more.team' },
  { key: 'reviews', path: 'reviews', icon: 'star', labelKey: 'partner.nav.reviews', describedBy: 'partner.more.reviews' },
  { key: 'money', path: 'money', icon: 'money', labelKey: 'partner.nav.money', describedBy: 'partner.more.money' },
  { key: 'account', path: 'account', icon: 'key', labelKey: 'partner.nav.account', describedBy: 'partner.more.account' },
];

/** The four beside the story button, in reading order. */
export const TAB_KEYS = ['home', 'bookings', 'trips', 'more'] as const;

/** What "More" lists: everything the tab bar does not carry. */
export const MORE_KEYS: readonly string[] = [
  'profile', 'stories', 'team', 'reviews', 'money', 'account',
];

/**
 * A path under the current language. Every link goes through here, so the
 * language is never dropped mid-task by a hand-written href.
 */
export function path(locale: Locale, rest: string): Route {
  return (rest === '' ? `/${locale}` : `/${locale}/${rest}`) as Route;
}

export function hrefOf(locale: Locale, key: string): Route {
  const found = DESTINATIONS.find((destination) => destination.key === key);
  if (found === undefined) throw new Error(`No destination "${key}"`);
  return path(locale, found.path);
}
