import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
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
import { vendors, vendorPayoutAccounts, payoutProviderEnum } from './vendors';
import { moneyAmount, moneyCurrency, primaryId, timestamps } from './_shared';

/**
 * MONEY.
 *
 * The platform holds other people's money across Paymob, Kashier, PayPal,
 * Fawry, InstaPay and Wise. A single-entry table will not reconcile against
 * six providers, so the ledger is double-entry: every movement is two rows
 * that sum to zero, and the sum of all rows is always zero (CLAUDE.md).
 */

export const paymentProviderEnum = payoutProviderEnum;

export const paymentStatusEnum = pgEnum('payment_status', [
  'initiated',
  'pending',
  'authorized',
  'captured',
  'failed',
  'cancelled',
  'refunded',
  'partiallyRefunded',
  'chargeback',
]);

export const paymentMethods = pgTable(
  'payment_methods',
  {
    id: primaryId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: paymentProviderEnum('provider').notNull(),
    /** Provider-side token. The card number never reaches us. */
    token: text('token').notNull(),
    brand: varchar('brand', { length: 40 }),
    last4: varchar('last4', { length: 4 }),
    expiryMonth: varchar('expiry_month', { length: 2 }),
    expiryYear: varchar('expiry_year', { length: 4 }),
    isDefault: varchar('is_default', { length: 5 }).notNull().default('false'),
    ...timestamps,
  },
  (table) => [index('payment_methods_user_idx').on(table.userId)],
);

export const payments = pgTable(
  'payments',
  {
    id: primaryId(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    provider: paymentProviderEnum('provider').notNull(),
    status: paymentStatusEnum('status').notNull().default('initiated'),
    amount: moneyAmount('amount').notNull(),
    currency: moneyCurrency('currency').notNull(),
    /** The provider's own id, for reconciliation against their statement. */
    providerReference: varchar('provider_reference', { length: 160 }),
    /**
     * Supplied by the client and unique per booking attempt, so a retried
     * request cannot charge twice.
     */
    idempotencyKey: varchar('idempotency_key', { length: 80 }).notNull(),
    failureCode: varchar('failure_code', { length: 80 }),
    failureMessage: text('failure_message'),
    /** The raw provider payload, kept for disputes. */
    providerPayload: jsonb('provider_payload').$type<Record<string, unknown>>(),
    authorizedAt: timestamp('authorized_at', { withTimezone: true, mode: 'date' }),
    capturedAt: timestamp('captured_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('payments_idempotency_key').on(table.idempotencyKey),
    index('payments_booking_idx').on(table.bookingId),
    index('payments_provider_reference_idx').on(table.provider, table.providerReference),
    check('payments_amount_positive', sql`${table.amount} > 0`),
  ],
);

export const refunds = pgTable(
  'refunds',
  {
    id: primaryId(),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id),
    amount: moneyAmount('amount').notNull(),
    currency: moneyCurrency('currency').notNull(),
    reasonKey: varchar('reason_key', { length: 120 }).notNull(),
    note: text('note'),
    providerReference: varchar('provider_reference', { length: 160 }),
    idempotencyKey: varchar('idempotency_key', { length: 80 }).notNull(),
    status: paymentStatusEnum('status').notNull().default('initiated'),
    processedAt: timestamp('processed_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('refunds_idempotency_key').on(table.idempotencyKey),
    index('refunds_payment_idx').on(table.paymentId),
    check('refunds_amount_positive', sql`${table.amount} > 0`),
  ],
);

export const payoutStatusEnum = pgEnum('payout_status', [
  'scheduled',
  'processing',
  'paid',
  'failed',
  'cancelled',
]);

export const payouts = pgTable(
  'payouts',
  {
    id: primaryId(),
    vendorId: uuid('vendor_id')
      .notNull()
      .references(() => vendors.id),
    payoutAccountId: uuid('payout_account_id')
      .notNull()
      .references(() => vendorPayoutAccounts.id),
    amount: moneyAmount('amount').notNull(),
    currency: moneyCurrency('currency').notNull(),
    status: payoutStatusEnum('status').notNull().default('scheduled'),
    /** Inclusive Cairo dates covered by this payout. */
    periodStart: timestamp('period_start', { withTimezone: true, mode: 'date' }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true, mode: 'date' }).notNull(),
    providerReference: varchar('provider_reference', { length: 160 }),
    paidAt: timestamp('paid_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    index('payouts_vendor_idx').on(table.vendorId, table.periodEnd),
    check('payouts_period', sql`${table.periodStart} <= ${table.periodEnd}`),
  ],
);

export const ledgerAccountEnum = pgEnum('ledger_account', [
  'travelerReceivable',
  'providerClearing',
  'platformCash',
  'vendorPayable',
  'platformCommission',
  'paymentFees',
  'refundsPayable',
  'taxPayable',
]);

/**
 * Double-entry. Every business event writes two or more rows sharing an
 * `entryGroupId`; within a group the signed amounts sum to zero, and a
 * balance is a SUM over an account rather than a number kept up to date by
 * hand — which is the only way six providers reconcile.
 *
 * Rows are append-only. A mistake is corrected by a reversing entry, never
 * by an UPDATE.
 */
export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: primaryId(),
    /** Ties the two-or-more sides of one event together. */
    entryGroupId: uuid('entry_group_id').notNull(),
    account: ledgerAccountEnum('account').notNull(),
    /** Signed minor units: debit positive, credit negative. */
    amount: moneyAmount('amount').notNull(),
    currency: moneyCurrency('currency').notNull(),
    bookingId: uuid('booking_id').references(() => bookings.id),
    vendorId: uuid('vendor_id').references(() => vendors.id),
    paymentId: uuid('payment_id').references(() => payments.id),
    refundId: uuid('refund_id').references(() => refunds.id),
    payoutId: uuid('payout_id').references(() => payouts.id),
    /** bookingConfirmed, paymentCaptured, refundIssued, payoutPaid. */
    eventKind: varchar('event_kind', { length: 60 }).notNull(),
    memo: text('memo'),
    /** The entry this one reverses, when it is a correction. */
    reversesEntryId: uuid('reverses_entry_id'),
    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('ledger_entries_group_idx').on(table.entryGroupId),
    index('ledger_entries_account_idx').on(table.account, table.occurredAt),
    index('ledger_entries_booking_idx').on(table.bookingId),
    index('ledger_entries_vendor_idx').on(table.vendorId, table.occurredAt),
    // A zero-amount leg is always a bug: either the event did not happen or
    // the amount was never worked out.
    check('ledger_entries_non_zero', sql`${table.amount} <> 0`),
  ],
);

export const paymentsRelations = relations(payments, ({ many, one }) => ({
  booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] }),
  refunds: many(refunds),
  ledgerEntries: many(ledgerEntries),
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  booking: one(bookings, { fields: [ledgerEntries.bookingId], references: [bookings.id] }),
  vendor: one(vendors, { fields: [ledgerEntries.vendorId], references: [vendors.id] }),
  payment: one(payments, { fields: [ledgerEntries.paymentId], references: [payments.id] }),
}));
