import { z } from 'zod';

import { currencySchema, localeSchema, numberingSystemSchema, userIdSchema, vendorIdSchema } from './common.ts';

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
  /**
   * Publish or reject **anyone's** listing, from the console's review queue.
   *
   * Separate from `catalog.publish`, which a vendor owner holds over their own
   * catalogue. Gating the console's review on the vendor-scoped one would have
   * let any owner publish any operator's service — the same distinction as
   * `vendor.readOwn` against `vendor.readAny`, and for the same reason.
   */
  'catalog.publishAny',
  'booking.createOwn',
  'booking.readOwn',
  'booking.cancelOwn',
  'booking.readVendor',
  'booking.manageVendor',
  /**
   * Every booking on the platform, not only one vendor's. Named the same way
   * as `vendor.readAny` and `user.readAny` because it is the same idea: the
   * vendor-scoped form answers "mine", this one answers "everyone's", and the
   * console's bookings, money and cancellation screens all need the second.
   */
  'booking.readAny',
  /**
   * Cancel or amend **anyone's** departure. The platform-side counterpart to
   * `booking.manageVendor`: a weather cancellation run from the console
   * reaches an operator's boat, so it cannot be gated on the permission that
   * operator holds over their own.
   */
  'booking.manageAny',
  /**
   * The safety record across every operator. Separate from the booking
   * permissions because an incident outlives the booking it came from, and
   * reading one is a different act from reading a manifest.
   */
  'incident.readAny',
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
  /**
   * Create an account, edit it, suspend it, end its sessions.
   *
   * Separate from `user.readAny` because reading a traveller's record to
   * answer a support question and suspending that traveller are different
   * acts, and a support role should be able to do the first without the
   * second.
   */
  'user.manage',
  /**
   * Grant or revoke a role — including `admin`.
   *
   * Its own permission, and deliberately the narrowest one here, because this
   * is the escalation path: anybody who can grant a role can grant themselves
   * every other permission in this list. Holding `user.manage` lets you
   * suspend an account; it does not let you promote one. Both are in the ADMIN
   * set today, but they can be pulled apart without a migration the moment
   * there is a support role that should not be able to mint admins.
   */
  'role.grant',
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

/**
 * The console's sign-in.
 *
 * Staff only. Travellers sign in by one-time code and never hold a password,
 * so this is not a second route into the same door — it is the only route
 * into a different one, the surface with no phone in the loop.
 *
 * Length is the only rule. Composition requirements — a digit, a symbol, a
 * capital — measurably push people towards `Password1!` and towards reuse,
 * which is why NIST dropped them.
 */
export const MIN_PASSWORD_LENGTH = 12;

export const passwordSignInSchema = z
  .object({
    email: z.string().email().max(320),
    /** Never logged, never echoed back, never put in a URL. */
    password: z.string().min(1).max(512),
  })
  .strict();

export const passwordSetSchema = z
  .object({
    email: z.string().email().max(320),
    password: z.string().min(MIN_PASSWORD_LENGTH).max(512),
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
