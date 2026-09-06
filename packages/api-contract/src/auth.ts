import { z } from 'zod';

import { currencySchema, localeSchema, numberingSystemSchema, userIdSchema, vendorIdSchema } from './common';

/**
 * Identity, roles and the permission matrix.
 *
 * The matrix lives in code rather than in the database so that a permission
 * change is a reviewable diff, and so the API and both apps cannot disagree
 * about who may do what.
 */

export const roleSchema = z.enum(['guest', 'traveler', 'vendorOwner', 'vendorStaff', 'admin']);
export type Role = z.infer<typeof roleSchema>;

/**
 * Permissions are verbs on resources, not screens. A screen may need several;
 * a permission is never named after a button.
 */
export const permissionSchema = z.enum([
  'catalog.read',
  'catalog.write',
  'catalog.publish',
  'booking.createOwn',
  'booking.readOwn',
  'booking.cancelOwn',
  'booking.readVendor',
  'booking.manageVendor',
  'vendor.readOwn',
  'vendor.writeOwn',
  'vendor.readAny',
  'vendor.verify',
  'staff.manage',
  'resource.manage',
  'pricing.manage',
  'payout.readOwn',
  'payout.manage',
  'review.write',
  'review.moderate',
  'taxonomy.manage',
  'user.readAny',
  'user.impersonate',
  'audit.read',
  'featureFlag.manage',
]);
export type Permission = z.infer<typeof permissionSchema>;

/**
 * A guest can browse and hold a cart. Everything that creates an obligation
 * needs a claimed account.
 */
const GUEST: readonly Permission[] = ['catalog.read'];

const TRAVELER: readonly Permission[] = [
  ...GUEST,
  'booking.createOwn',
  'booking.readOwn',
  'booking.cancelOwn',
  'review.write',
];

/** Staff run the day. They do not touch money or the vendor's own record. */
const VENDOR_STAFF: readonly Permission[] = [
  'catalog.read',
  'catalog.write',
  'booking.readVendor',
  'booking.manageVendor',
  'vendor.readOwn',
  'resource.manage',
];

const VENDOR_OWNER: readonly Permission[] = [
  ...VENDOR_STAFF,
  'catalog.publish',
  'vendor.writeOwn',
  'staff.manage',
  'pricing.manage',
  'payout.readOwn',
];

const ADMIN: readonly Permission[] = permissionSchema.options.filter(
  // Admins hold every permission except the two that only make sense for a
  // vendor acting on its own record; an admin uses the `.readAny`/`.manage`
  // forms instead, which are audited.
  (permission) => permission !== 'vendor.writeOwn' && permission !== 'payout.readOwn',
);

export const PERMISSIONS_BY_ROLE: Readonly<Record<Role, readonly Permission[]>> = {
  guest: GUEST,
  traveler: TRAVELER,
  vendorStaff: VENDOR_STAFF,
  vendorOwner: VENDOR_OWNER,
  admin: ADMIN,
};

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS_BY_ROLE[role].includes(permission);
}

export function canAny(roles: readonly Role[], permission: Permission): boolean {
  return roles.some((role) => can(role, permission));
}

// --- Authentication -------------------------------------------------------

/**
 * Egypt's mobile numbers are +20 followed by a 10-digit subscriber number
 * beginning 1. Travelers arrive with every other country code too, so the
 * schema is E.164 with a documented default rather than an Egypt-only rule.
 */
export const e164Schema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, 'Enter the number in international format, starting with +.');

export const DEFAULT_COUNTRY_CALLING_CODE = '+20';

export const phoneStartSchema = z
  .object({
    phone: e164Schema,
    locale: localeSchema.optional(),
  })
  .strict();

export const phoneVerifySchema = z
  .object({
    phone: e164Schema,
    /** Six digits. Never logged, never returned. */
    code: z.string().regex(/^\d{6}$/),
    /** Present when a guest session is being claimed rather than replaced. */
    guestSessionId: z.string().uuid().optional(),
  })
  .strict();

export const emailStartSchema = z
  .object({
    email: z.string().email(),
    locale: localeSchema.optional(),
  })
  .strict();

export const oauthProviderSchema = z.enum(['apple', 'google']);

export const oauthCallbackSchema = z
  .object({
    provider: oauthProviderSchema,
    /** Authorisation code from the provider. Exchanged server-side only. */
    code: z.string().min(1),
    redirectUri: z.string().url(),
    guestSessionId: z.string().uuid().optional(),
  })
  .strict();

/**
 * A guest session is a real session with a real id, so a cart survives, an
 * abandoned checkout can be resumed, and the session can later be claimed by
 * whoever signs in — without a second identity being created.
 */
export const guestSessionSchema = z
  .object({
    deviceId: z.string().min(8).max(128),
    locale: localeSchema.optional(),
  })
  .strict();

export const sessionSchema = z
  .object({
    id: z.string().uuid(),
    userId: userIdSchema.nullable(),
    roles: z.array(roleSchema).min(1),
    /** Set when the session is acting for a vendor. */
    vendorId: vendorIdSchema.nullable(),
    isGuest: z.boolean(),
    expiresAt: z.coerce.date(),
  })
  .strict();
export type Session = z.infer<typeof sessionSchema>;

export const userPreferencesSchema = z
  .object({
    locale: localeSchema,
    currency: currencySchema,
    numberingSystem: numberingSystemSchema,
    theme: z.enum(['light', 'dark', 'system']),
    /** Respect the OS setting, but let a user force it on. */
    reducedMotion: z.boolean().default(false),
  })
  .strict();
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

/**
 * The SMS gateway is behind an interface because the Egyptian market is a
 * moving target — Vodafone aggregators, SMSMisr, Twilio — and the auth flow
 * must not care which one is answering today.
 */
export interface OtpTransport {
  readonly name: string;
  send(input: { to: string; code: string; locale: string }): Promise<{ messageId: string }>;
}
