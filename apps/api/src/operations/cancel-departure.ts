import { TRPCError } from '@trpc/server';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { commissionMinor } from '@dahab/api-contract';
import type { Database } from '@dahab/db';
import { schema } from '@dahab/db';
import { SOURCE_LOCALE, type Locale } from '@dahab/i18n/server';

import type { Context } from '../context.ts';

/**
 * Cancelling a departure, in one place.
 *
 * Two surfaces run this: the console, over any operator's boat, and the
 * operator app, over its own. They differ in **who may**, not in **what
 * happens** — so the scope is a parameter and the cascade is not duplicated.
 * Two implementations of a weather cancellation is how one of them ends up
 * refunding the commission and the other does not.
 *
 * `scopeToVendor` is the whole of the difference: the console passes null and
 * reaches any departure; the operator app passes its own id from the session,
 * and a slot belonging to anyone else reads as NOT_FOUND rather than
 * FORBIDDEN — a 403 on a specific id confirms that id exists.
 */

export interface CancellationPreview {
  slot: {
    id: string;
    startsAt: string;
    serviceTitle: string;
    vendorName: string;
    capacity: number;
    booked: number;
  };
  currency: 'EGP';
  bookings: { reference: string; status: string }[];
  refunds: { reference: string; amountMinor: number }[];
  releases: { reference: string; amountMinor: number }[];
  refundTotalMinor: number;
  ledgerLegs: number;
  notifications: number;
}

const LIVE_STATUSES = ['pendingPayment', 'confirmed', 'awaitingVendor'] as const;

async function findSlot(
  db: Database,
  slotId: string,
  scopeToVendor: string | null,
  locale: Locale,
) {
  const wanted = alias(schema.serviceTranslations, 'wanted_title');
  const fallback = alias(schema.serviceTranslations, 'fallback_title');

  const [slot] = await db
    .select({
      id: schema.availabilitySlots.id,
      startsAt: schema.availabilitySlots.startsAt,
      capacity: schema.availabilitySlots.capacity,
      booked: schema.availabilitySlots.bookedCount,
      isCancelled: schema.availabilitySlots.isCancelled,
      vendorId: schema.services.vendorId,
      vendorName: schema.vendors.displayName,
      title: sql<string>`coalesce(${wanted.title}, ${fallback.title})`,
    })
    .from(schema.availabilitySlots)
    .innerJoin(schema.services, eq(schema.services.id, schema.availabilitySlots.serviceId))
    .innerJoin(schema.vendors, eq(schema.vendors.id, schema.services.vendorId))
    .leftJoin(wanted, and(eq(wanted.serviceId, schema.services.id), eq(wanted.locale, locale)))
    .leftJoin(
      fallback,
      and(eq(fallback.serviceId, schema.services.id), eq(fallback.locale, SOURCE_LOCALE)),
    )
    .where(
      scopeToVendor === null
        ? eq(schema.availabilitySlots.id, slotId)
        : and(
            eq(schema.availabilitySlots.id, slotId),
            eq(schema.services.vendorId, scopeToVendor),
          ),
    )
    .limit(1);

  if (slot === undefined) {
    // Deliberately NOT_FOUND for another operator's slot. FORBIDDEN on a
    // specific id tells the caller that id exists, which is the whole thing
    // the scope is meant to hide.
    throw new TRPCError({ code: 'NOT_FOUND', message: 'No such departure.' });
  }
  return slot;
}

/** Everything the cancellation would touch, from the rows a commit would. */
export async function previewCancellation(
  db: Database,
  slotId: string,
  scopeToVendor: string | null,
  locale: Locale,
): Promise<CancellationPreview> {
  const slot = await findSlot(db, slotId, scopeToVendor, locale);

  const held = await db
    .select({
      reference: schema.bookings.reference,
      status: schema.bookings.status,
      totalAmount: schema.bookings.totalAmount,
      capturedMinor: sql<number>`coalesce(sum(${schema.payments.amount}) filter (
        where ${schema.payments.status} = 'captured'
      ), 0)::bigint`,
    })
    .from(schema.bookings)
    .leftJoin(schema.payments, eq(schema.payments.bookingId, schema.bookings.id))
    .where(
      and(
        eq(schema.bookings.slotId, slotId),
        inArray(schema.bookings.status, [...LIVE_STATUSES]),
      ),
    )
    .groupBy(schema.bookings.id)
    .orderBy(asc(schema.bookings.reference));

  const refunds = held
    .filter((row) => Number(row.capturedMinor) > 0)
    .map((row) => ({ reference: row.reference, amountMinor: Number(row.capturedMinor) }));
  const releases = held
    .filter((row) => Number(row.capturedMinor) === 0)
    .map((row) => ({ reference: row.reference, amountMinor: Number(row.totalAmount) }));

  return {
    slot: {
      id: slot.id,
      startsAt: slot.startsAt.toISOString(),
      serviceTitle: slot.title,
      vendorName: slot.vendorName,
      capacity: slot.capacity,
      booked: slot.booked,
    },
    currency: 'EGP',
    bookings: held.map((row) => ({ reference: row.reference, status: row.status })),
    refunds,
    releases,
    refundTotalMinor: refunds.reduce((total, row) => total + row.amountMinor, 0),
    // Three legs per refund: the vendor's share back, the commission back,
    // and the refund payable it lands in.
    ledgerLegs: refunds.length * 3,
    // One message per booking, and one to the operator.
    notifications: held.length + 1,
  };
}

export interface CancellationResult {
  ok: true;
  cancelled: number;
  refunded: number;
  released: number;
  refundTotalMinor: number;
  ledgerLegs: number;
  cascadeId: string;
}

/**
 * Commits it, in one transaction.
 *
 * The order is the order the preview showed, from the same rows: the slot is
 * marked cancelled and its seats released, every live booking moves to
 * `cancelledByWeather` with a history row carrying one shared `cascade_id`,
 * every captured payment gets a refund, and each refund writes a balanced
 * ledger group with the commission included — the platform does not keep its
 * cut of a trip that never ran.
 *
 * Bookings with nothing captured are released rather than refunded: there is
 * no money to send back, and a zero-amount refund row would be a lie in the
 * ledger, which is why the table rejects one.
 */
export async function commitCancellation(
  db: Database,
  ctx: Context,
  input: { slotId: string; reason: string; scopeToVendor: string | null; actorKind: string },
): Promise<CancellationResult> {
  return db.transaction(async (tx) => {
    const slot = await findSlot(tx, input.slotId, input.scopeToVendor, ctx.locale);

    if (slot.isCancelled) {
      throw new TRPCError({ code: 'CONFLICT', message: 'This departure is already cancelled.' });
    }

    const held = await tx
      .select({
        id: schema.bookings.id,
        reference: schema.bookings.reference,
        status: schema.bookings.status,
      })
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.slotId, input.slotId),
          inArray(schema.bookings.status, [...LIVE_STATUSES]),
        ),
      )
      .orderBy(asc(schema.bookings.reference));

    const [group] = await tx.execute<{ id: string }>(sql`SELECT uuid_generate_v7() AS id`);
    const cascadeId = group?.id;
    if (cascadeId === undefined) throw new Error('Could not mint a cascade id.');

    await tx
      .update(schema.availabilitySlots)
      .set({
        isCancelled: true,
        cancellationReason: input.reason,
        // The seats go back. A cancelled slot still holding its headcount
        // makes every capacity figure on every screen wrong.
        bookedCount: 0,
        updatedAt: ctx.now,
      })
      .where(eq(schema.availabilitySlots.id, input.slotId));

    let refunded = 0;
    let released = 0;
    let refundTotalMinor = 0;
    let ledgerLegs = 0;

    for (const booking of held) {
      await tx
        .update(schema.bookings)
        .set({ status: 'cancelledByWeather', updatedAt: ctx.now })
        .where(eq(schema.bookings.id, booking.id));

      await tx.insert(schema.bookingStatusHistory).values({
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: 'cancelledByWeather',
        actorUserId: ctx.session?.userId ?? null,
        actorKind: input.actorKind,
        reasonKey: 'booking.reason.weather',
        note: input.reason,
        // One id across every booking the cancellation hit, so the whole
        // cascade can be read back — or undone — as a single act.
        cascadeId,
        createdAt: ctx.now,
        updatedAt: ctx.now,
      });

      const captured = await tx
        .select({
          id: schema.payments.id,
          amount: schema.payments.amount,
          currency: schema.payments.currency,
        })
        .from(schema.payments)
        .where(
          and(eq(schema.payments.bookingId, booking.id), eq(schema.payments.status, 'captured')),
        );

      if (captured.length === 0) {
        released += 1;
        continue;
      }

      for (const payment of captured) {
        const amount = Number(payment.amount);
        const [refund] = await tx
          .insert(schema.refunds)
          .values({
            paymentId: payment.id,
            bookingId: booking.id,
            amount,
            currency: payment.currency,
            reasonKey: 'refund.reason.weather',
            note: input.reason,
            // Keyed on the cascade and the payment, so a retry of this whole
            // cancellation cannot refund the same capture twice.
            idempotencyKey: `cascade-${cascadeId}-${payment.id}`.slice(0, 80),
            status: 'refunded',
            processedAt: ctx.now,
            createdAt: ctx.now,
            updatedAt: ctx.now,
          })
          .returning({ id: schema.refunds.id });
        if (refund === undefined) throw new Error('The refund row was not written.');

        const commission = commissionMinor(amount);
        ledgerLegs += await writeLedgerGroup(tx, 'refundIssued', ctx.now, [
          { account: 'vendorPayable', amount: amount - commission },
          { account: 'platformCommission', amount: commission },
          { account: 'refundsPayable', amount: -amount },
        ], {
          bookingId: booking.id,
          vendorId: slot.vendorId,
          paymentId: payment.id,
          refundId: refund.id,
          currency: payment.currency,
        });

        refunded += 1;
        refundTotalMinor += amount;
      }
    }

    await tx.insert(schema.auditLog).values({
      actorUserId: ctx.session?.userId ?? null,
      actorKind: input.actorKind,
      actorLabel: ctx.session?.roles.join(',') ?? null,
      entityTable: 'availability_slots',
      entityId: slot.id,
      action: 'departure.cancelled',
      reason: input.reason,
      beforeJson: { isCancelled: false, bookedCount: slot.booked },
      afterJson: {
        isCancelled: true,
        bookedCount: 0,
        cascadeId,
        bookingsCancelled: held.length,
        refunded,
        released,
        refundTotalMinor,
      },
      requestId: ctx.requestId,
      createdAt: ctx.now,
    });

    ctx.logger.info('departure cancelled', {
      slotId: slot.id,
      cascadeId,
      scope: input.scopeToVendor ?? 'platform',
      cancelled: held.length,
      refunded,
      released,
      refundTotalMinor,
    });

    return {
      ok: true as const,
      cancelled: held.length,
      refunded,
      released,
      refundTotalMinor,
      ledgerLegs,
      cascadeId,
    };
  });
}

type LedgerAccount = (typeof schema.ledgerAccountEnum.enumValues)[number];

/**
 * One business event, as rows that sum to zero.
 *
 * The sum is checked rather than trusted, because an unbalanced group is
 * silent: nothing fails, and the money screen's claim that the eight accounts
 * come to zero quietly stops being true.
 */
async function writeLedgerGroup(
  tx: Database,
  eventKind: string,
  occurredAt: Date,
  legs: readonly { account: LedgerAccount; amount: number }[],
  links: {
    bookingId: string;
    vendorId: string;
    paymentId: string;
    refundId: string;
    currency: string;
  },
): Promise<number> {
  const sum = legs.reduce((total, leg) => total + leg.amount, 0);
  if (sum !== 0) {
    throw new Error(`Ledger group ${eventKind} does not balance: ${sum}`);
  }

  const [group] = await tx.execute<{ id: string }>(sql`SELECT uuid_generate_v7() AS id`);
  const entryGroupId = group?.id;
  if (entryGroupId === undefined) throw new Error('Could not mint a ledger group id.');

  const { currency, ...bound } = links;
  await tx.insert(schema.ledgerEntries).values(
    legs.map((leg) => ({
      entryGroupId,
      account: leg.account,
      amount: leg.amount,
      currency,
      eventKind,
      occurredAt,
      ...bound,
    })),
  );
  return legs.length;
}
