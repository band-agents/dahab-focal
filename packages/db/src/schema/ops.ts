import { relations } from 'drizzle-orm';
import {
  boolean,
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

import { bookings } from './booking';
import { users } from './identity';
import { vendors } from './vendors';
import { moneyAmount, moneyCurrency, primaryId, timestamps } from './_shared';

/** OPS — the things that go wrong, and the record of who did what. */

export const incidentSeverityEnum = pgEnum('incident_severity', [
  'nearMiss',
  'minor',
  'serious',
  'critical',
]);

export const incidentKindEnum = pgEnum('incident_kind', [
  'divingIncident',
  'decompressionIllness',
  'equipmentFailure',
  'vesselIncident',
  'vehicleIncident',
  'medicalEmergency',
  'marineLifeInjury',
  'weatherEvent',
  'lostDiver',
  'other',
]);

/**
 * Dahab has a hyperbaric chamber, and diving incidents are a real safety
 * category rather than a support ticket type (CLAUDE.md). These rows are
 * append-heavy, read under pressure, and never soft-deleted.
 */
export const incidents = pgTable(
  'incidents',
  {
    id: primaryId(),
    reference: varchar('reference', { length: 16 }).notNull(),
    bookingId: uuid('booking_id').references(() => bookings.id),
    vendorId: uuid('vendor_id')
      .notNull()
      .references(() => vendors.id),
    reportedByUserId: uuid('reported_by_user_id').references(() => users.id),
    kind: incidentKindEnum('kind').notNull(),
    severity: incidentSeverityEnum('severity').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' }).notNull(),
    /** Free text, in whatever language it was written in. Never translated
     * away: the original wording is what an investigation reads. */
    narrative: text('narrative').notNull(),
    /** Set when the casualty went to the chamber. */
    chamberTreatment: boolean('chamber_treatment').notNull().default(false),
    /** Depth and time profile, when the incident was a dive. */
    diveProfile: jsonb('dive_profile').$type<Record<string, unknown>>(),
    affectedUserIds: jsonb('affected_user_ids').$type<string[]>().notNull().default([]),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
    resolution: text('resolution'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('incidents_reference_key').on(table.reference),
    index('incidents_vendor_idx').on(table.vendorId, table.occurredAt),
    index('incidents_severity_idx').on(table.severity, table.occurredAt),
  ],
);

export const disputeStatusEnum = pgEnum('dispute_status', [
  'open',
  'awaitingTraveler',
  'awaitingVendor',
  'underReview',
  'resolved',
  'escalated',
  'closed',
]);

export const disputes = pgTable(
  'disputes',
  {
    id: primaryId(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id),
    raisedByUserId: uuid('raised_by_user_id')
      .notNull()
      .references(() => users.id),
    status: disputeStatusEnum('status').notNull().default('open'),
    reasonKey: varchar('reason_key', { length: 120 }).notNull(),
    description: text('description').notNull(),
    claimedAmount: moneyAmount('claimed_amount'),
    claimedCurrency: moneyCurrency('claimed_currency'),
    resolvedAmount: moneyAmount('resolved_amount'),
    resolvedCurrency: moneyCurrency('resolved_currency'),
    assignedToUserId: uuid('assigned_to_user_id').references(() => users.id),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
    resolutionNote: text('resolution_note'),
    ...timestamps,
  },
  (table) => [
    index('disputes_booking_idx').on(table.bookingId),
    index('disputes_status_idx').on(table.status, table.createdAt),
  ],
);

/**
 * Who changed what, with the before and after. Append-only: an audit log that
 * can be edited audits nothing.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: primaryId(),
    actorUserId: uuid('actor_user_id').references(() => users.id),
    /** user, system, job, webhook — a job has no user but still has a name. */
    actorKind: varchar('actor_kind', { length: 20 }).notNull(),
    actorLabel: varchar('actor_label', { length: 120 }),
    entityTable: varchar('entity_table', { length: 80 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    action: varchar('action', { length: 40 }).notNull(),
    /**
     * Why the actor did it, in their words.
     *
     * An admin holds every permission, so the counterweight is that a
     * consequential action records a reason — a rejection the vendor actually
     * receives, an impersonation a reviewer can judge. Nullable because system
     * and job actors have no reason to give beyond their own name.
     */
    reason: text('reason'),
    /** Only the changed keys, both sides, so the diff is readable. */
    beforeJson: jsonb('before_json').$type<Record<string, unknown>>(),
    afterJson: jsonb('after_json').$type<Record<string, unknown>>(),
    requestId: varchar('request_id', { length: 64 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('audit_log_entity_idx').on(table.entityTable, table.entityId, table.createdAt),
    index('audit_log_actor_idx').on(table.actorUserId, table.createdAt),
    index('audit_log_request_idx').on(table.requestId),
  ],
);

export const featureFlags = pgTable(
  'feature_flags',
  {
    id: primaryId(),
    key: varchar('key', { length: 80 }).notNull(),
    description: text('description').notNull(),
    isEnabled: boolean('is_enabled').notNull().default(false),
    /** 0 to 100. A flag is a dial, not a switch. */
    rolloutPercentage: integer('rollout_percentage').notNull().default(0),
    /** Explicit allow list, evaluated before the percentage. */
    enabledForUserIds: jsonb('enabled_for_user_ids').$type<string[]>().notNull().default([]),
    enabledForVendorIds: jsonb('enabled_for_vendor_ids').$type<string[]>().notNull().default([]),
    ...timestamps,
  },
  (table) => [uniqueIndex('feature_flags_key').on(table.key)],
);

export const incidentsRelations = relations(incidents, ({ one }) => ({
  booking: one(bookings, { fields: [incidents.bookingId], references: [bookings.id] }),
  vendor: one(vendors, { fields: [incidents.vendorId], references: [vendors.id] }),
}));

export const disputesRelations = relations(disputes, ({ one }) => ({
  booking: one(bookings, { fields: [disputes.bookingId], references: [bookings.id] }),
}));
