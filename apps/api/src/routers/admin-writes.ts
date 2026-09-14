import { TRPCError } from '@trpc/server';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';

import { commissionMinor } from '@dahab/api-contract';
import { schema } from '@dahab/db';
import type { Database } from '@dahab/db';

import { requireDatabase } from '../database.ts';
import { requirePermission } from '../trpc.ts';
import type { Context } from '../context.ts';

/**
 * The admin console's writes.
 *
 * Three rules hold for every procedure here, and they are the reason these
 * live apart from the reads rather than beside them:
 *
 *  1. **A reason is required.** An admin holds every permission, so the
 *     counterweight is that a consequential act records why — a rejection the
 *     vendor actually receives, a cancellation an investigation can read.
 *     `audit_log.reason` exists for this and is never null on these paths.
 *  2. **One transaction.** A cancellation that refunded four travellers and
 *     then failed to write the fifth would leave the ledger unbalanced and
 *     the boat half cancelled. Either all of it happened or none of it did.
 *  3. **An audit row, with both sides.** Only the fields that changed, before
 *     and after, plus the request id — so a screenshot of a complaint is
 *     enough to find what was done and by whom.
 *
 * Nothing here is idempotent by accident. Each write first re-reads the row it
 * is about to change and refuses if it is no longer in the state the operator
 * was looking at, because two admins on the same queue is the normal case and
 * the second one must not silently undo the first.
 */

/** The shortest reason worth storing. Long enough to be a sentence. */
const MIN_REASON = 8;
const reasonSchema = z.string().trim().min(MIN_REASON).max(2000);

const okSchema = z.object({ ok: z.literal(true) });

/**
 * Writes the audit row.
 *
 * Takes the transaction, not the database: an audit row committed while the
 * change it describes rolls back is worse than no audit row at all.
 */
async function audit(
  tx: Database,
  ctx: Context,
  entry: {
    entityTable: string;
    entityId: string;
    action: string;
    reason: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  },
): Promise<void> {
  await tx.insert(schema.auditLog).values({
    actorUserId: ctx.session?.userId ?? null,
    actorKind: 'user',
    actorLabel: ctx.session?.roles.join(',') ?? null,
    entityTable: entry.entityTable,
    entityId: entry.entityId,
    action: entry.action,
    reason: entry.reason,
    beforeJson: entry.before,
    afterJson: entry.after,
    requestId: ctx.requestId,
    createdAt: ctx.now,
  });
}

export const adminWritesRouter = {
  /**
   * A02 · verify or reject one of an operator's documents.
   *
   * A rejection's reason is copied onto the document itself, not only into the
   * audit log: the operator has to be told what was wrong with their permit,
   * and "rejected" with no sentence attached is how a vendor re-uploads the
   * same file four times.
   */
  reviewDocument: requirePermission('vendor.verify')
    .input(
      z.object({
        documentId: z.string().uuid(),
        decision: z.enum(['verified', 'rejected']),
        reason: reasonSchema,
      }),
    )
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);

      return db.transaction(async (tx) => {
        const [document] = await tx
          .select({
            id: schema.vendorDocuments.id,
            vendorId: schema.vendorDocuments.vendorId,
            type: schema.vendorDocuments.type,
            status: schema.vendorDocuments.verificationStatus,
          })
          .from(schema.vendorDocuments)
          .where(eq(schema.vendorDocuments.id, input.documentId))
          .limit(1);

        if (document === undefined) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'No such document.' });
        }
        if (document.status === input.decision) {
          // Not an error the operator caused — someone else got there first.
          throw new TRPCError({
            code: 'CONFLICT',
            message: `This document is already ${input.decision}. Reload the queue.`,
          });
        }

        await tx
          .update(schema.vendorDocuments)
          .set({
            verificationStatus: input.decision,
            reviewedBy: ctx.session?.userId ?? null,
            reviewedAt: ctx.now,
            // Cleared on approval: a stale rejection note under a verified
            // permit reads as though it were still refused.
            rejectionReason: input.decision === 'rejected' ? input.reason : null,
            updatedAt: ctx.now,
          })
          .where(eq(schema.vendorDocuments.id, input.documentId));

        await audit(tx, ctx, {
          entityTable: 'vendor_documents',
          entityId: document.id,
          action: `document.${input.decision}`,
          reason: input.reason,
          before: { verificationStatus: document.status },
          after: { verificationStatus: input.decision, vendorId: document.vendorId },
        });

        ctx.logger.info('document reviewed', {
          documentId: document.id,
          decision: input.decision,
        });
        return { ok: true as const };
      });
    }),

  /**
   * A04 · publish or reject a listing.
   *
   * Gated on `catalog.publishAny`, not `catalog.publish`. The second is what a
   * vendor owner holds over their own catalogue; gating the console's review
   * queue on it would have let any owner publish any operator's service.
   */
  reviewService: requirePermission('catalog.publishAny')
    .input(
      z.object({
        serviceId: z.string().uuid(),
        decision: z.enum(['published', 'rejected']),
        reason: reasonSchema,
      }),
    )
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);

      return db.transaction(async (tx) => {
        const [service] = await tx
          .select({
            id: schema.services.id,
            vendorId: schema.services.vendorId,
            status: schema.services.status,
          })
          .from(schema.services)
          .where(eq(schema.services.id, input.serviceId))
          .limit(1);

        if (service === undefined) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'No such service.' });
        }
        if (service.status === input.decision) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `This listing is already ${input.decision}. Reload the queue.`,
          });
        }

        await tx
          .update(schema.services)
          .set({ status: input.decision, updatedAt: ctx.now })
          .where(eq(schema.services.id, input.serviceId));

        await audit(tx, ctx, {
          entityTable: 'services',
          entityId: service.id,
          action: `service.${input.decision}`,
          reason: input.reason,
          before: { status: service.status },
          after: { status: input.decision, vendorId: service.vendorId },
        });

        ctx.logger.info('service reviewed', { serviceId: service.id, decision: input.decision });
        return { ok: true as const };
      });
    }),

  /**
   * A05 · cancel a departure, and everything that follows from it.
   *
   * This is the one write that moves money. The cascade the console previewed
   * is committed here in the same order and from the same rows, so what the
   * operator agreed to is what happens:
   *
   *   the slot is marked cancelled and its seats released
   *   → every live booking on it moves to `cancelledByWeather`, each with a
   *     history row carrying one shared `cascade_id`
   *   → every captured payment gets a refund row
   *   → each refund writes a balanced ledger group, commission included,
   *     because the platform does not keep its cut of a trip that never ran
   *
   * Bookings with nothing captured are released rather than refunded: there
   * is no money to send back, and a zero-amount refund row would be a lie in
   * the ledger — which is why the table rejects one.
   */
  cancelDeparture: requirePermission('booking.manageAny')
    .input(z.object({ slotId: z.string().uuid(), reason: reasonSchema }))
    .output(
      z.object({
        ok: z.literal(true),
        cancelled: z.number().int(),
        refunded: z.number().int(),
        released: z.number().int(),
        refundTotalMinor: z.number().int(),
        ledgerLegs: z.number().int(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);

      return db.transaction(async (tx) => {
        const [slot] = await tx
          .select({
            id: schema.availabilitySlots.id,
            isCancelled: schema.availabilitySlots.isCancelled,
            bookedCount: schema.availabilitySlots.bookedCount,
            serviceId: schema.availabilitySlots.serviceId,
            vendorId: schema.services.vendorId,
          })
          .from(schema.availabilitySlots)
          .innerJoin(schema.services, eq(schema.services.id, schema.availabilitySlots.serviceId))
          .where(eq(schema.availabilitySlots.id, input.slotId))
          .limit(1);

        if (slot === undefined) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'No such departure.' });
        }
        if (slot.isCancelled) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This departure is already cancelled.',
          });
        }

        // The same query the preview ran, so the operator is committing the
        // list they were shown rather than whatever it has become.
        const held = await tx
          .select({
            id: schema.bookings.id,
            reference: schema.bookings.reference,
            status: schema.bookings.status,
            totalAmount: schema.bookings.totalAmount,
            currency: schema.bookings.totalCurrency,
          })
          .from(schema.bookings)
          .where(
            and(
              eq(schema.bookings.slotId, input.slotId),
              inArray(schema.bookings.status, ['pendingPayment', 'confirmed', 'awaitingVendor']),
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
            actorKind: 'user',
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
              and(
                eq(schema.payments.bookingId, booking.id),
                eq(schema.payments.status, 'captured'),
              ),
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
                // Keyed on the cascade and the payment, so a retry of this
                // whole cancellation cannot refund the same capture twice.
                idempotencyKey: `cascade-${cascadeId}-${payment.id}`.slice(0, 80),
                status: 'refunded',
                processedAt: ctx.now,
                createdAt: ctx.now,
                updatedAt: ctx.now,
              })
              .returning({ id: schema.refunds.id });
            if (refund === undefined) throw new Error('The refund row was not written.');

            const commission = commissionMinor(amount);
            ledgerLegs += await writeLedgerGroup(
              tx,
              'refundIssued',
              ctx.now,
              [
                { account: 'vendorPayable', amount: amount - commission },
                { account: 'platformCommission', amount: commission },
                { account: 'refundsPayable', amount: -amount },
              ],
              {
                bookingId: booking.id,
                vendorId: slot.vendorId,
                paymentId: payment.id,
                refundId: refund.id,
                currency: payment.currency,
              },
            );

            refunded += 1;
            refundTotalMinor += amount;
          }
        }

        await audit(tx, ctx, {
          entityTable: 'availability_slots',
          entityId: slot.id,
          action: 'departure.cancelled',
          reason: input.reason,
          before: { isCancelled: false, bookedCount: slot.bookedCount },
          after: {
            isCancelled: true,
            bookedCount: 0,
            cascadeId,
            bookingsCancelled: held.length,
            refunded,
            released,
            refundTotalMinor,
          },
        });

        ctx.logger.info('departure cancelled', {
          slotId: slot.id,
          cascadeId,
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
        };
      });
    }),
};

type LedgerAccount = (typeof schema.ledgerAccountEnum.enumValues)[number];

/**
 * One business event, as rows that sum to zero.
 *
 * The sum is checked here rather than trusted, because an unbalanced group is
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
