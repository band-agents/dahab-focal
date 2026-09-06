import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import {
  currencyEnum,
  deletedAt,
  localeEnum,
  numberingSystemEnum,
  primaryId,
  roleEnum,
  themeEnum,
  timestamps,
  verificationStatusEnum,
} from './_shared';

/** IDENTITY — who the traveler is, and what they are qualified to do. */

export const users = pgTable(
  'users',
  {
    id: primaryId(),
    /** E.164. Egypt is +20, but travelers arrive from everywhere. */
    phone: varchar('phone', { length: 20 }),
    phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true, mode: 'date' }),
    email: varchar('email', { length: 320 }),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true, mode: 'date' }),
    appleSubject: varchar('apple_subject', { length: 255 }),
    googleSubject: varchar('google_subject', { length: 255 }),
    /**
     * A guest becomes a user by claiming their session, so a cart survives
     * sign-in. Until then the row exists with no contact details at all.
     */
    isGuest: boolean('is_guest').notNull().default(false),
    ...timestamps,
    deletedAt: deletedAt(),
  },
  (table) => [
    uniqueIndex('users_phone_key').on(table.phone),
    uniqueIndex('users_email_key').on(table.email),
    uniqueIndex('users_apple_subject_key').on(table.appleSubject),
    uniqueIndex('users_google_subject_key').on(table.googleSubject),
  ],
);

export const userRoles = pgTable(
  'user_roles',
  {
    id: primaryId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull(),
    /** Set for vendorOwner / vendorStaff: which vendor this role is for. */
    vendorId: uuid('vendor_id'),
    ...timestamps,
  },
  (table) => [uniqueIndex('user_roles_unique').on(table.userId, table.role, table.vendorId)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: primaryId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Opaque device fingerprint, so a guest cart survives an app restart. */
    deviceId: varchar('device_id', { length: 128 }),
    userAgent: text('user_agent'),
    /** Only the hash is stored; the token itself is never persisted. */
    refreshTokenHash: varchar('refresh_token_hash', { length: 128 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    index('sessions_user_idx').on(table.userId),
    uniqueIndex('sessions_refresh_token_key').on(table.refreshTokenHash),
  ],
);

/**
 * One-time codes. Stored hashed with an attempt counter, because an OTP that
 * can be brute-forced is not a second factor.
 */
export const otpChallenges = pgTable(
  'otp_challenges',
  {
    id: primaryId(),
    /** The phone or email the code was sent to. */
    destination: varchar('destination', { length: 320 }).notNull(),
    codeHash: varchar('code_hash', { length: 128 }).notNull(),
    attempts: jsonb('attempts').$type<{ count: number; lastAt: string }>().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [index('otp_destination_idx').on(table.destination, table.expiresAt)],
);

export const userProfiles = pgTable('user_profiles', {
  id: primaryId(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  displayName: varchar('display_name', { length: 80 }),
  avatarUrl: text('avatar_url'),
  /** ISO 3166-1 alpha-2. Drives the resident rate and the no-fly warning. */
  countryCode: varchar('country_code', { length: 2 }),
  dateOfBirth: date('date_of_birth'),
  bio: text('bio'),
  ...timestamps,
});

export const userPreferences = pgTable('user_preferences', {
  id: primaryId(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  locale: localeEnum('locale').notNull().default('en-GB'),
  currency: currencyEnum('currency').notNull().default('EGP'),
  /** Western digits are the Egyptian default, even in Arabic. */
  numberingSystem: numberingSystemEnum('numbering_system').notNull().default('latn'),
  theme: themeEnum('theme').notNull().default('system'),
  reducedMotion: boolean('reduced_motion').notNull().default(false),
  ...timestamps,
});

/**
 * The traveler's certification vault. Certifications gate activities — the
 * Arch at the Blue Hole is technical-only — so this is an access-control
 * table, not a profile decoration.
 */
export const certifications = pgTable(
  'certifications',
  {
    id: primaryId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** PADI, SSI, CMAS, RAID, TDI, AIDA, Molchanovs. */
    agency: varchar('agency', { length: 40 }).notNull(),
    /** "Open Water", "Advanced", "Trimix", "AIDA 3". */
    level: varchar('level', { length: 80 }).notNull(),
    certificateNumber: varchar('certificate_number', { length: 80 }),
    issuedOn: date('issued_on'),
    /** Some ratings expire; a null here means it does not. */
    expiresOn: date('expires_on'),
    /** The deepest depth this rating permits, in metres. */
    maxDepthMetres: varchar('max_depth_metres', { length: 8 }),
    cardImageUrl: text('card_image_url'),
    verificationStatus: verificationStatusEnum('verification_status')
      .notNull()
      .default('pending'),
    verifiedBy: uuid('verified_by').references(() => users.id),
    verifiedAt: timestamp('verified_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    index('certifications_user_idx').on(table.userId),
    // Expiry sweeps read this: "whose cards lapse in the next 30 days".
    index('certifications_expiry_idx').on(table.expiresOn),
  ],
);

/** Dahab has a hyperbaric chamber. This is the row that gets read at 3 a.m. */
export const emergencyContacts = pgTable(
  'emergency_contacts',
  {
    id: primaryId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    relationship: varchar('relationship', { length: 60 }),
    phone: varchar('phone', { length: 20 }).notNull(),
    email: varchar('email', { length: 320 }),
    isPrimary: boolean('is_primary').notNull().default(false),
    ...timestamps,
  },
  (table) => [index('emergency_contacts_user_idx').on(table.userId)],
);

/**
 * Medical declarations. Held separately from the profile so access can be
 * restricted to the operator running the dive, on the day, and audited.
 */
export const medicalInfo = pgTable('medical_info', {
  id: primaryId(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** The RSTC/PADI medical questionnaire, answer by answer. */
  declarations: jsonb('declarations').$type<Record<string, boolean>>().notNull(),
  /** Set when any declaration requires a doctor's sign-off before diving. */
  requiresPhysicianClearance: boolean('requires_physician_clearance')
    .notNull()
    .default(false),
  physicianClearanceUrl: text('physician_clearance_url'),
  clearanceExpiresOn: date('clearance_expires_on'),
  allergies: text('allergies'),
  medications: text('medications'),
  notes: text('notes'),
  ...timestamps,
});

export const usersRelations = relations(users, ({ many, one }) => ({
  roles: many(userRoles),
  sessions: many(sessions),
  profile: one(userProfiles, { fields: [users.id], references: [userProfiles.userId] }),
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
  certifications: many(certifications),
  emergencyContacts: many(emergencyContacts),
  medical: one(medicalInfo, { fields: [users.id], references: [medicalInfo.userId] }),
}));
