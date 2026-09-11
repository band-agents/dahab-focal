import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { services } from './catalog.ts';
import { resources } from './vendors.ts';
import { serviceVariants } from './options.ts';
import { primaryId, timestamps } from './_shared.ts';

/**
 * AVAILABILITY.
 *
 * Templates describe the intent ("two-tank boat dive, 08:00, Sunday to
 * Thursday"); slots are the generated rows a booking actually holds a place
 * in. Both exist because a template cannot be locked and a slot cannot be
 * edited in bulk.
 */

export const availabilityTemplates = pgTable(
  'availability_templates',
  {
    id: primaryId(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => serviceVariants.id, {
      onDelete: 'cascade',
    }),
    /**
     * ISO weekdays this template runs on: 1 Monday … 7 Sunday. Friday and
     * Saturday are the Egyptian weekend, so a template that skips them is
     * skipping the busiest days, not the quietest.
     */
    weekdays: jsonb('weekdays').$type<number[]>().notNull(),
    /** Minutes past midnight, Cairo. 480 is the 08:00 Blue Hole departure. */
    startMinute: smallint('start_minute').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    capacity: integer('capacity').notNull(),
    /** When set, capacity is the resource's, not this number. */
    resourceId: uuid('resource_id').references(() => resources.id, { onDelete: 'set null' }),
    validFrom: date('valid_from').notNull(),
    validUntil: date('valid_until'),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index('availability_templates_service_idx').on(table.serviceId),
    check(
      'availability_templates_start_minute',
      sql`${table.startMinute} >= 0 AND ${table.startMinute} < 1440`,
    ),
    check('availability_templates_capacity', sql`${table.capacity} >= 1`),
    check(
      'availability_templates_valid_range',
      sql`${table.validUntil} IS NULL OR ${table.validFrom} <= ${table.validUntil}`,
    ),
  ],
);

/**
 * A concrete departure. `startsAt` is a timestamptz stored UTC; the Cairo
 * calendar day is written alongside it because that is what a vendor filters
 * by, and deriving it per query would defeat the index.
 */
export const availabilitySlots = pgTable(
  'availability_slots',
  {
    id: primaryId(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => serviceVariants.id, {
      onDelete: 'cascade',
    }),
    templateId: uuid('template_id').references(() => availabilityTemplates.id, {
      onDelete: 'set null',
    }),
    startsAt: timestamp('starts_at', { withTimezone: true, mode: 'date' }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true, mode: 'date' }).notNull(),
    /** The Cairo calendar day `startsAt` falls on, as YYYY-MM-DD. */
    localDate: date('local_date').notNull(),
    capacity: integer('capacity').notNull(),
    /** Maintained transactionally as bookings are confirmed and cancelled. */
    bookedCount: integer('booked_count').notNull().default(0),
    resourceId: uuid('resource_id').references(() => resources.id, { onDelete: 'set null' }),
    /** Weather cancels boats; this is set by the cancellation cascade. */
    isCancelled: boolean('is_cancelled').notNull().default(false),
    cancellationReason: text('cancellation_reason'),
    ...timestamps,
  },
  (table) => [
    index('availability_slots_service_date_idx').on(table.serviceId, table.localDate),
    index('availability_slots_starts_at_idx').on(table.startsAt),
    index('availability_slots_resource_idx').on(table.resourceId, table.startsAt),
    uniqueIndex('availability_slots_unique').on(table.serviceId, table.variantId, table.startsAt),
    check('availability_slots_capacity', sql`${table.capacity} >= 0`),
    // The one invariant that keeps a boat from being oversold.
    check(
      'availability_slots_not_oversold',
      sql`${table.bookedCount} >= 0 AND ${table.bookedCount} <= ${table.capacity}`,
    ),
    check('availability_slots_ends_after_starts', sql`${table.endsAt} > ${table.startsAt}`),
  ],
);

/**
 * Dates a vendor is closed: Eid, a boat out of the water, a guide's leave.
 * Held against the vendor or a single service, so closing the whole shop is
 * one row rather than one per listing.
 */
export const blackoutDates = pgTable(
  'blackout_dates',
  {
    id: primaryId(),
    vendorId: uuid('vendor_id').notNull(),
    serviceId: uuid('service_id').references(() => services.id, { onDelete: 'cascade' }),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    reasonKey: varchar('reason_key', { length: 120 }),
    note: text('note'),
    ...timestamps,
  },
  (table) => [
    index('blackout_dates_vendor_idx').on(table.vendorId, table.startDate),
    index('blackout_dates_service_idx').on(table.serviceId),
    check('blackout_dates_range', sql`${table.startDate} <= ${table.endDate}`),
  ],
);

export const availabilitySlotsRelations = relations(availabilitySlots, ({ one }) => ({
  service: one(services, { fields: [availabilitySlots.serviceId], references: [services.id] }),
  template: one(availabilityTemplates, {
    fields: [availabilitySlots.templateId],
    references: [availabilityTemplates.id],
  }),
  resource: one(resources, {
    fields: [availabilitySlots.resourceId],
    references: [resources.id],
  }),
}));
