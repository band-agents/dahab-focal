import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { availabilitySlots } from './availability';
import { services } from './catalog';
import { certifications, users } from './identity';
import { options } from './options';
import { vendors } from './vendors';
import {
  currencyEnum,
  localeEnum,
  moneyAmount,
  moneyCurrency,
  participantKindEnum,
  primaryId,
  timestamps,
} from './_shared';

/** BOOKING — the obligation, its people, and every state it has been in. */

export const bookingStatusEnum = pgEnum('booking_status', [
  'pendingPayment',
  'confirmed',
  'awaitingVendor',
  'cancelledByTraveler',
  'cancelledByVendor',
  'cancelledByWeather',
  'noShow',
  'completed',
  'refunded',
  'disputed',
]);

export const bookings = pgTable(
  'bookings',
  {
    id: primaryId(),
    /** Human-quotable at a dive-centre counter: DF-7K2M9Q. */
    reference: varchar('reference', { length: 16 }).notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    vendorId: uuid('vendor_id')
      .notNull()
      .references(() => vendors.id),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id),
    slotId: uuid('slot_id').references(() => availabilitySlots.id),
    status: bookingStatusEnum('status').notNull().default('pendingPayment'),

    /** The instant the activity starts, UTC. Rendered in Africa/Cairo. */
    startsAt: timestamp('starts_at', { withTimezone: true, mode: 'date' }).notNull(),
    /** The Cairo calendar day, for the vendor's day sheet. */
    localDate: date('local_date').notNull(),

    /**
     * The complete price breakdown computePrice() produced, stored verbatim.
     * A quote must be reproducible years later, and the rules behind it will
     * have changed by then.
     */
    priceBreakdown: jsonb('price_breakdown').$type<Record<string, unknown>>().notNull(),
    totalAmount: moneyAmount('total_amount').notNull(),
    totalCurrency: moneyCurrency('total_currency').notNull(),
    /** The EUR equivalent shown alongside, and the rate that produced it. */
    displayCurrency: currencyEnum('display_currency'),
    displayAmount: moneyAmount('display_amount'),
    fxRateMicros: integer('fx_rate_micros'),

    partyAdults: integer('party_adults').notNull().default(0),
    partyChildren: integer('party_children').notNull().default(0),
    partyInfants: integer('party_infants').notNull().default(0),
    partyStudents: integer('party_students').notNull().default(0),
    partyResidents: integer('party_residents').notNull().default(0),

    locale: localeEnum('locale').notNull().default('en-GB'),
    travelerNote: text('traveler_note'),
    vendorNote: text('vendor_note'),

    /** Set by the trip planner when a flight is close to a dive. */
    noFlyWarningAcknowledgedAt: timestamp('no_fly_warning_acknowledged_at', {
      withTimezone: true,
      mode: 'date',
    }),

    confirmedAt: timestamp('confirmed_at', { withTimezone: true, mode: 'date' }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true, mode: 'date' }),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('bookings_reference_key').on(table.reference),
    index('bookings_user_idx').on(table.userId, table.startsAt),
    index('bookings_vendor_date_idx').on(table.vendorId, table.localDate),
    index('bookings_slot_idx').on(table.slotId),
    index('bookings_status_idx').on(table.status),
    check('bookings_total_non_negative', sql`${table.totalAmount} >= 0`),
  ],
);

/**
 * One row per person on the trip. Certification and medical flags are copied
 * here at booking time — what mattered is what was true on the day, not what
 * the traveler's vault says a year later.
 */
export const bookingParticipants = pgTable(
  'booking_participants',
  {
    id: primaryId(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    /** Null for a guest in the party who has no account of their own. */
    userId: uuid('user_id').references(() => users.id),
    kind: participantKindEnum('kind').notNull(),
    fullName: varchar('full_name', { length: 160 }).notNull(),
    dateOfBirth: date('date_of_birth'),
    /** The certification presented for this trip, if one was required. */
    certificationId: uuid('certification_id').references(() => certifications.id),
    certificationSnapshot: jsonb('certification_snapshot').$type<Record<string, unknown>>(),
    /** True when the medical questionnaire needs a doctor's sign-off. */
    medicalFlag: boolean('medical_flag').notNull().default(false),
    medicalNote: text('medical_note'),
    /** Last logged dive, for the "when did you last dive?" refresher rule. */
    lastDiveOn: date('last_dive_on'),
    ...timestamps,
  },
  (table) => [
    index('booking_participants_booking_idx').on(table.bookingId),
    index('booking_participants_medical_idx').on(table.medicalFlag),
  ],
);

export const bookingAddons = pgTable(
  'booking_addons',
  {
    id: primaryId(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    optionId: uuid('option_id').references(() => options.id),
    labelKey: varchar('label_key', { length: 120 }).notNull(),
    quantity: integer('quantity').notNull().default(1),
    unitPriceAmount: moneyAmount('unit_price_amount').notNull(),
    unitPriceCurrency: moneyCurrency('unit_price_currency').notNull(),
    perPerson: boolean('per_person').notNull().default(false),
    ...timestamps,
  },
  (table) => [index('booking_addons_booking_idx').on(table.bookingId)],
);

/**
 * Signed waivers, archived. The signature and the exact text signed are both
 * kept: a waiver that points at a document which has since been edited is
 * not a waiver.
 */
export const waivers = pgTable(
  'waivers',
  {
    id: primaryId(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    participantId: uuid('participant_id').references(() => bookingParticipants.id, {
      onDelete: 'cascade',
    }),
    /** Version of the waiver text, so the archive is unambiguous. */
    documentVersion: varchar('document_version', { length: 40 }).notNull(),
    documentHash: varchar('document_hash', { length: 128 }).notNull(),
    documentUrl: text('document_url').notNull(),
    locale: localeEnum('locale').notNull(),
    signedAt: timestamp('signed_at', { withTimezone: true, mode: 'date' }).notNull(),
    signatureImageUrl: text('signature_image_url'),
    signerName: varchar('signer_name', { length: 160 }).notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    ...timestamps,
  },
  (table) => [
    index('waivers_booking_idx').on(table.bookingId),
    index('waivers_participant_idx').on(table.participantId),
  ],
);

/**
 * Every transition, with who caused it. Weather cancellations cascade across
 * many bookings at once, and afterwards someone always asks what happened.
 */
export const bookingStatusHistory = pgTable(
  'booking_status_history',
  {
    id: primaryId(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    fromStatus: bookingStatusEnum('from_status'),
    toStatus: bookingStatusEnum('to_status').notNull(),
    /** Null when the change came from a job rather than a person. */
    actorUserId: uuid('actor_user_id').references(() => users.id),
    actorKind: varchar('actor_kind', { length: 20 }).notNull(),
    reasonKey: varchar('reason_key', { length: 120 }),
    note: text('note'),
    /** Groups a single weather cancellation across every booking it hit. */
    cascadeId: uuid('cascade_id'),
    ...timestamps,
  },
  (table) => [
    index('booking_status_history_booking_idx').on(table.bookingId, table.createdAt),
    index('booking_status_history_cascade_idx').on(table.cascadeId),
  ],
);

export const bookingsRelations = relations(bookings, ({ many, one }) => ({
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
  vendor: one(vendors, { fields: [bookings.vendorId], references: [vendors.id] }),
  service: one(services, { fields: [bookings.serviceId], references: [services.id] }),
  slot: one(availabilitySlots, {
    fields: [bookings.slotId],
    references: [availabilitySlots.id],
  }),
  participants: many(bookingParticipants),
  addons: many(bookingAddons),
  waivers: many(waivers),
  statusHistory: many(bookingStatusHistory),
}));
