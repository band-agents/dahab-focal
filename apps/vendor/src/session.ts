import { SOURCE_LOCALE, directionOf, isLocale, type Locale } from '@dahab/i18n';
import type { Direction, Script, ThemeName } from '@dahab/ui';

/**
 * Who is holding the phone, and in what language.
 *
 * The role is the product's defining split. From the permission matrix:
 * `vendorStaff` holds catalog.read, catalog.write, booking.readVendor,
 * booking.manageVendor, vendor.readOwn and resource.manage — and nothing
 * else. `vendorOwner` adds catalog.publish, vendor.writeOwn, staff.manage,
 * pricing.manage and payout.readOwn.
 *
 * So a guide sees no money, sets no prices, manages no staff and cannot
 * publish. That is designed as a real difference — fewer sections, a service
 * editor that hands off for publishing — rather than as greyed-out buttons.
 *
 * Read from the URL at module scope so the first paint is already correct,
 * the same way the gallery does it.
 */

export type VendorRole = 'vendorOwner' | 'vendorStaff';

export interface VendorSession {
  readonly role: VendorRole;
  readonly theme: ThemeName;
  readonly locale: Locale;
  readonly direction: Direction;
  readonly script: Script;
  readonly vendorName: string;
  readonly person: string;
}

const ROLES: readonly VendorRole[] = ['vendorOwner', 'vendorStaff'];
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
    console.warn(`vendor: ?${key}=${raw} is not one of ${allowed.join(' | ')} — using ${fallback}.`);
    return fallback;
  }
  return match;
}

function readSession(): VendorSession {
  const params = search();
  const role = pick(params, 'role', ROLES, 'vendorOwner');
  const theme = pick(params, 'theme', THEMES, 'light');

  const rawLocale = params.get('locale');
  // Arabic first on this surface: a Dahab dive centre's staff work in it, and
  // traveller-facing Arabic being one of seven locales is a different fact.
  const locale: Locale =
    rawLocale === null ? 'ar-EG' : isLocale(rawLocale) ? rawLocale : SOURCE_LOCALE;

  return {
    role,
    theme,
    locale,
    direction: directionOf(locale),
    script: locale === 'ar-EG' ? 'arabic' : 'latin',
    vendorName: 'Fanous Divers',
    person: role === 'vendorOwner' ? 'Mahmoud' : 'Yasmin',
  };
}

export const session: VendorSession = readSession();

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
