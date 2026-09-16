import { SOURCE_LOCALE, directionOf, isLocale, type Locale } from '@dahab/i18n';
import type { Direction, Script, ThemeName } from '@dahab/ui';

import { initialLocale, readStored, type StoredSession, type VendorRole } from './auth';

/**
 * Who is holding the phone, and in what language.
 *
 * The role is the product's defining split, and it comes from the API now
 * rather than from a query string. From the permission matrix: `vendorStaff`
 * holds catalog.read, catalog.write, booking.readVendor, booking.manageVendor,
 * vendor.readOwn and resource.manage — and nothing else. `vendorOwner` adds
 * catalog.publish, vendor.writeOwn, staff.manage, pricing.manage and
 * payout.readOwn.
 *
 * So a guide sees no money, sets no prices, manages no staff and cannot
 * publish. That is a real difference — fewer sections, a service editor that
 * hands off for publishing — rather than greyed-out buttons.
 *
 * Read synchronously at module scope so the first paint is already in the
 * right language and direction. An async read would mean a flash of English
 * on an Arabic-first surface, which is the one thing this app must not do.
 */

export type { VendorRole } from './auth';

export interface VendorSession {
  readonly role: VendorRole;
  readonly theme: ThemeName;
  readonly locale: Locale;
  readonly direction: Direction;
  readonly script: Script;
  readonly vendorId: string | null;
  readonly email: string | null;
  /**
   * Their own name and their operator's, both from the API. Null where the
   * profile carries none — which the screens render as an unnamed greeting
   * rather than as an invented one.
   */
  readonly displayName: string | null;
  readonly vendorName: string | null;
  readonly accessToken: string;
}

const THEMES: readonly ThemeName[] = ['light', 'dark'];

function search(): URLSearchParams {
  if (typeof window === 'undefined' || typeof window.location === 'undefined') {
    return new URLSearchParams();
  }
  return new URLSearchParams(window.location.search);
}

/**
 * Theme and locale still read the URL.
 *
 * Not as a way in — the role no longer does, which was the actual hole — but
 * because being able to open the app in Night Dive or in German without an
 * account is how the screenshots get taken and how a translation gets checked.
 */
function themeFromUrl(): ThemeName {
  const raw = search().get('theme');
  const match = THEMES.find((candidate) => candidate === raw);
  return match ?? 'light';
}

export function localeFromUrl(): Locale {
  const raw = search().get('locale');
  if (raw === null) return initialLocale(null);
  return isLocale(raw) ? raw : SOURCE_LOCALE;
}

export function toSession(stored: StoredSession, locale = localeFromUrl()): VendorSession {
  return {
    role: stored.role,
    theme: themeFromUrl(),
    locale,
    direction: directionOf(locale),
    script: locale === 'ar-EG' ? 'arabic' : 'latin',
    vendorId: stored.vendorId,
    email: stored.email,
    displayName: stored.displayName,
    vendorName: stored.vendorName,
    accessToken: stored.accessToken,
  };
}

/** The session the app opened with, or null when nobody is signed in. */
export function restore(): VendorSession | null {
  const stored = readStored();
  return stored === null ? null : toSession(stored);
}

/** The permissions this role actually holds, straight from the matrix. */
export const OWNER_ONLY = [
  'catalog.publish',
  'vendor.writeOwn',
  'staff.manage',
  'pricing.manage',
  'payout.readOwn',
] as const;

export function isOwner(role: VendorRole): boolean {
  return role === 'vendorOwner';
}
