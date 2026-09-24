import { TRPCError } from '@trpc/server';
import { and, asc, count, desc, eq, gte, inArray, isNotNull, lte, ne, sql, sum } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';

import { currencySchema } from '@dahab/api-contract';
import { schema } from '@dahab/db';
import { LOCALES, SOURCE_LOCALE } from '@dahab/i18n';


import { requirePermission, router } from '../trpc.ts';
import { asCurrency, cairoDay, requireDb } from './_shared.ts';
import { adminPeopleRouter } from './admin-people.ts';
import { adminUserWritesRouter } from './admin-user-writes.ts';
import { adminWritesRouter } from './admin-writes.ts';
import type { Context } from '../context.ts';

/**
 * The admin console's reads.
 *
 * Every procedure is gated by the permission it actually needs, never by a
 * role check — `vendor.readAny` and `audit.read` are different answers to
 * different questions, and the matrix in @dahab/api-contract is the single
 * place either is decided.
 *
 * These are reads only. The writes an admin performs (verify, suspend,
 * cancel a departure, reverse a ledger entry) each carry a reason and an
 * audit row, so they want their own pass rather than being bolted on here.
 */


const vendorSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  neighborhood: z.string().nullable(),
  status: z.enum(['applied', 'inReview', 'active', 'suspended', 'closed']),
  services: z.number().int(),
  staff: z.number().int(),
  joined: z.string(),
  /**
   * Hundredths of a star, so the rating never touches the float path on its
   * way to a screen. Null where nobody has reviewed the operator yet — which
   * is a different fact from a rating of zero, and has to read differently.
   */
  ratingHundredths: z.number().int().nullable(),
  reviews: z.number().int(),
});

const documentSchema = z.object({
  id: z.string().uuid(),
  vendorId: z.string().uuid(),
  vendorName: z.string(),
  type: z.string(),
  status: z.enum(['pending', 'inReview', 'verified', 'rejected', 'expired']),
  expiresOn: z.string().nullable(),
  issuer: z.string().nullable(),
  documentNumber: z.string().nullable(),
  issuedOn: z.string().nullable(),
  /** Whether a lapse stops the operator trading, not merely warns them. */
  blocksPublishing: z.boolean(),
});

/**
 * Heads by kind, straight off the manifest.
 *
 * Every kind is optional because a party that is two adults has no children
 * key at all, and a shape that claims `children: 0` where the question was
 * never asked reads as an answer. Infants and an accompanying instructor
 * appear here and nowhere on the booking's own count columns — they hold a
 * seat without being billed, which is the number the boat depends on.
 */
const partySchema = z.object({
  adult: z.number().int().optional(),
  child: z.number().int().optional(),
  infant: z.number().int().optional(),
  student: z.number().int().optional(),
  resident: z.number().int().optional(),
  instructor: z.number().int().optional(),
});

const bookingSchema = z.object({
  id: z.string().uuid(),
  reference: z.string(),
  serviceTitle: z.string(),
  vendorName: z.string(),
  /** Null where nobody on the manifest has claimed an account. */
  travelerName: z.string().nullable(),
  startsAt: z.string(),
  status: z.enum([
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
  ]),
  party: partySchema,
  totalMinor: z.number().int(),
  currency: currencySchema,
});

/**
 * The eight accounts, in the order a balance sheet reads them.
 *
 * Listed here rather than derived from the enum so the console's ordering is
 * a deliberate choice — receivable through to tax, money coming in before
 * money owed out — instead of whatever order Postgres happens to return.
 */
const LEDGER_ACCOUNTS = [
  'travelerReceivable',
  'providerClearing',
  'platformCash',
  'vendorPayable',
  'platformCommission',
  'paymentFees',
  'refundsPayable',
  'taxPayable',
] as const;

const DAY_MS = 86_400_000;

export const adminRouter = router({
  /**
   * The roster, with the two counts the list actually shows. Counting in SQL
   * rather than in JS keeps a vendor with four hundred services from arriving
   * as four hundred rows nobody renders.
   */
  vendors: requirePermission('vendor.readAny')
    .output(z.array(vendorSchema))
    .query(async ({ ctx }) => {
      const db = requireDb(ctx);

      // Each subquery's count needs its own SQL alias: three joined
      // subqueries all exposing a column called "total" is ambiguous to
      // Postgres the moment one of them is referenced unqualified.
      const serviceCounts = db
        .select({
          vendorId: schema.services.vendorId,
          total: count().as('service_total'),
        })
        .from(schema.services)
        .groupBy(schema.services.vendorId)
        .as('service_counts');

      const staffCounts = db
        .select({
          vendorId: schema.staff.vendorId,
          total: count().as('staff_total'),
        })
        .from(schema.staff)
        .groupBy(schema.staff.vendorId)
        .as('staff_counts');

      // Averaged in SQL and returned in hundredths. Only published reviews
      // count: a review hidden by moderation must not move a public rating.
      const reviewStats = db
        .select({
          vendorId: schema.reviews.vendorId,
          total: count().as('review_total'),
          ratingHundredths:
            sql<number>`round(avg(${schema.reviews.rating}) * 100)::int`.as('rating_hundredths'),
        })
        .from(schema.reviews)
        .where(eq(schema.reviews.moderationStatus, 'published'))
        .groupBy(schema.reviews.vendorId)
        .as('review_stats');

      const rows = await db
        .select({
          id: schema.vendors.id,
          displayName: schema.vendors.displayName,
          neighborhood: schema.vendors.neighborhood,
          status: schema.vendors.status,
          createdAt: schema.vendors.createdAt,
          services: serviceCounts.total,
          staff: staffCounts.total,
          reviews: reviewStats.total,
          ratingHundredths: reviewStats.ratingHundredths,
        })
        .from(schema.vendors)
        .leftJoin(serviceCounts, eq(serviceCounts.vendorId, schema.vendors.id))
        .leftJoin(staffCounts, eq(staffCounts.vendorId, schema.vendors.id))
        .leftJoin(reviewStats, eq(reviewStats.vendorId, schema.vendors.id))
        .orderBy(asc(schema.vendors.displayName));

      return rows.map((row) => ({
        id: row.id,
        displayName: row.displayName,
        neighborhood: row.neighborhood,
        status: row.status,
        services: Number(row.services ?? 0),
        staff: Number(row.staff ?? 0),
        joined: row.createdAt.toISOString(),
        ratingHundredths:
          row.ratingHundredths === null ? null : Number(row.ratingHundredths),
        reviews: Number(row.reviews ?? 0),
      }));
    }),

  /** Documents the platform still owes an answer on. */
  verificationQueue: requirePermission('vendor.verify')
    .output(z.array(documentSchema))
    .query(async ({ ctx }) => {
      const db = requireDb(ctx);
      const rows = await db
        .select({
          id: schema.vendorDocuments.id,
          vendorId: schema.vendorDocuments.vendorId,
          vendorName: schema.vendors.displayName,
          type: schema.vendorDocuments.type,
          status: schema.vendorDocuments.verificationStatus,
          expiresOn: schema.vendorDocuments.expiresOn,
          documentNumber: schema.vendorDocuments.documentNumber,
          issuedOn: schema.vendorDocuments.issuedOn,
          issuer: schema.vendorDocuments.issuer,
          blocksPublishing: schema.vendorDocuments.blocksPublishing,
        })
        .from(schema.vendorDocuments)
        .innerJoin(schema.vendors, eq(schema.vendors.id, schema.vendorDocuments.vendorId))
        .where(
          sql`${schema.vendorDocuments.verificationStatus} in ('pending', 'inReview', 'rejected')`,
        )
        .orderBy(asc(schema.vendorDocuments.createdAt));

      return rows.map(toDocument);
    }),

  /**
   * Everything that lapses, ordered by how little time is left.
   *
   * The window is a parameter rather than four fixed queries: the console
   * groups into bands, but "what expires in the next N days" is the question
   * the database is actually being asked.
   */
  expiring: requirePermission('vendor.readAny')
    .input(z.object({ withinDays: z.number().int().min(1).max(365).default(90) }))
    .output(z.array(documentSchema))
    .query(async ({ ctx, input }) => {
      const db = requireDb(ctx);
      // Compared in SQL against the request's own `now`, so a fixed clock in a
      // test produces a fixed answer, and nothing does date arithmetic in
      // local time.
      const horizon = new Date(ctx.now.getTime() + input.withinDays * 86_400_000);

      const rows = await db
        .select({
          id: schema.vendorDocuments.id,
          vendorId: schema.vendorDocuments.vendorId,
          vendorName: schema.vendors.displayName,
          type: schema.vendorDocuments.type,
          status: schema.vendorDocuments.verificationStatus,
          expiresOn: schema.vendorDocuments.expiresOn,
          documentNumber: schema.vendorDocuments.documentNumber,
          issuedOn: schema.vendorDocuments.issuedOn,
          issuer: schema.vendorDocuments.issuer,
          blocksPublishing: schema.vendorDocuments.blocksPublishing,
        })
        .from(schema.vendorDocuments)
        .innerJoin(schema.vendors, eq(schema.vendors.id, schema.vendorDocuments.vendorId))
        .where(
          and(
            isNotNull(schema.vendorDocuments.expiresOn),
            lte(schema.vendorDocuments.expiresOn, horizon.toISOString().slice(0, 10)),
          ),
        )
        .orderBy(asc(schema.vendorDocuments.expiresOn));

      return rows.map(toDocument);
    }),

  /**
   * The comparable attribute set for a category, with how many services carry
   * a value for each — the number that tells an admin what retiring one costs.
   */
  attributeUsage: requirePermission('taxonomy.manage')
    .input(z.object({ categorySlug: z.string().min(1) }))
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          key: z.string(),
          dataType: z.string(),
          unit: z.string().nullable(),
          isComparable: z.boolean(),
          comparisonGroup: z.string().nullable(),
          /**
           * What puts "40 minutes" and "1 hour" on the same axis. `none`
           * means the value is already canonical — shown as such rather than
           * hidden, because a missing rule on a measure is a bug waiting.
           */
          normalization: z.string(),
          /** Choices for enum / multiEnum; zero for every other data type. */
          options: z.number().int(),
          valuesOnServices: z.number().int(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const db = requireDb(ctx);

      const usage = db
        .select({
          definitionId: schema.serviceAttributeValues.attributeDefinitionId,
          total: count().as('total'),
        })
        .from(schema.serviceAttributeValues)
        .groupBy(schema.serviceAttributeValues.attributeDefinitionId)
        .as('usage');

      const rows = await db
        .select({
          id: schema.attributeDefinitions.id,
          key: schema.attributeDefinitions.key,
          dataType: schema.attributeDefinitions.dataType,
          unit: schema.attributeDefinitions.unit,
          isComparable: schema.attributeDefinitions.isComparable,
          comparisonGroup: schema.attributeDefinitions.comparisonGroup,
          normalizationRule: schema.attributeDefinitions.normalizationRule,
          optionsJson: schema.attributeDefinitions.optionsJson,
          valuesOnServices: usage.total,
        })
        .from(schema.attributeDefinitions)
        .innerJoin(
          schema.categories,
          eq(schema.categories.id, schema.attributeDefinitions.categoryId),
        )
        .leftJoin(usage, eq(usage.definitionId, schema.attributeDefinitions.id))
        .where(eq(schema.categories.slug, input.categorySlug))
        .orderBy(
          asc(schema.attributeDefinitions.comparisonOrder),
          asc(schema.attributeDefinitions.key),
        );

      return rows.map((row) => ({
        id: row.id,
        key: row.key,
        dataType: row.dataType,
        unit: row.unit,
        isComparable: row.isComparable,
        comparisonGroup: row.comparisonGroup,
        normalization: row.normalizationRule.kind,
        options: row.optionsJson.length,
        valuesOnServices: Number(row.valuesOnServices ?? 0),
      }));
    }),

  /** The audit trail. Newest first, because that is how it is read. */
  audit: requirePermission('audit.read')
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          at: z.string(),
          actor: z.string().nullable(),
          action: z.string(),
          entity: z.string(),
          /** Why the actor did it. The counterweight to admin holding every permission. */
          reason: z.string().nullable(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const db = requireDb(ctx);
      const rows = await db
        .select()
        .from(schema.auditLog)
        .orderBy(desc(schema.auditLog.createdAt))
        .limit(input.limit);

      return rows.map((row) => ({
        id: row.id,
        at: row.createdAt.toISOString(),
        actor: row.actorLabel ?? row.actorUserId,
        action: row.action,
        entity: `${row.entityTable}:${row.entityId}`,
        reason: row.reason,
      }));
    }),

  /**
   * A01 · the numbers across the top of Today.
   *
   * Counted in one pass rather than by the screen adding up rows it happens
   * to have fetched: "five things need action" has to be true of the whole
   * platform, not of the first page of a table.
   *
   * There is no weather provider wired up, so the conditions the design shows
   * are absent rather than guessed. A plausible wind speed on a screen that
   * decides whether a boat sails is worse than no wind speed at all.
   */
  overview: requirePermission('vendor.readAny')
    .output(
      z.object({
        today: z.string(),
        currency: currencySchema,
        departuresToday: z.number().int(),
        seatsBookedToday: z.number().int(),
        seatsCapacityToday: z.number().int(),
        needsAction: z.number().int(),
        incidentsRecent: z.number().int(),
        incidentsOpen: z.number().int(),
        expiringSoon: z.number().int(),
        blockingExpiries: z.number().int(),
        disputesOpen: z.number().int(),
        grossMinor: z.number().int(),
        commissionMinor: z.number().int(),
        takeRateBasisPoints: z.number().int(),
        payoutsDueCount: z.number().int(),
        payoutsDueMinor: z.number().int(),
        /** Null until a weather source exists. Not a placeholder reading. */
        conditions: z.null(),
      }),
    )
    .query(async ({ ctx }) => {
      const db = requireDb(ctx);
      const today = cairoDay(ctx.now);
      // Thirty days, matching the label the counter carries. The expiry board
      // itself asks for wider windows; this is the one that needs a decision.
      const horizon = new Date(ctx.now.getTime() + 30 * DAY_MS).toISOString().slice(0, 10);
      const thirtyDaysAgo = new Date(ctx.now.getTime() - 30 * DAY_MS);
      const sevenDaysAgo = new Date(ctx.now.getTime() - 7 * DAY_MS);

      /*
       * Ten counts, fetched at once.
       *
       * They were awaited one after another, and every one is a round trip to
       * a database in eu-west-1 — about 75 ms from Cairo before the query does
       * any work. Ten in a row made this the slowest call in the console:
       * 1.1 to 1.6 seconds, on the first screen anybody opens. None of them
       * reads another's result, so there was never a reason to queue them.
       * Ten fits the pool's ten connections exactly.
       */
      const [
        [departures],
        [queue],
        [catalogue],
        [openDisputes],
        [recentIncidents],
        [unresolvedIncidents],
        [expiring],
        [gross],
        [commission],
        [due],
      ] = await Promise.all([
        db
          .select({
            total: count(),
            booked: sum(schema.availabilitySlots.bookedCount),
            capacity: sum(schema.availabilitySlots.capacity),
          })
          .from(schema.availabilitySlots)
          .where(
            and(
              eq(schema.availabilitySlots.localDate, today),
              eq(schema.availabilitySlots.isCancelled, false),
            ),
          ),

        db
          .select({ total: count() })
          .from(schema.vendorDocuments)
          .where(
            sql`${schema.vendorDocuments.verificationStatus} in ('pending', 'inReview', 'rejected')`,
          ),

        db
          .select({ total: count() })
          .from(schema.services)
          .where(sql`${schema.services.status} in ('draft', 'underReview', 'rejected')`),

        db
          .select({ total: count() })
          .from(schema.disputes)
          .where(sql`${schema.disputes.status} not in ('resolved', 'closed')`),

        db
          .select({ total: count() })
          .from(schema.incidents)
          .where(gte(schema.incidents.occurredAt, sevenDaysAgo)),

        db
          .select({ total: count() })
          .from(schema.incidents)
          .where(sql`${schema.incidents.resolvedAt} is null`),

        db
          .select({
            total: count(),
            blocking: sql<number>`count(*) filter (where ${schema.vendorDocuments.blocksPublishing})::int`,
          })
          .from(schema.vendorDocuments)
          .where(
            and(
              isNotNull(schema.vendorDocuments.expiresOn),
              lte(schema.vendorDocuments.expiresOn, horizon),
            ),
          ),

        // Gross and commission both come off the ledger rather than off the
        // bookings table: the ledger is what reconciles, and a booking whose
        // payment never captured has a total but has moved no money.
        db
          .select({ total: sum(schema.ledgerEntries.amount) })
          .from(schema.ledgerEntries)
          .where(
            and(
              eq(schema.ledgerEntries.account, 'travelerReceivable'),
              eq(schema.ledgerEntries.eventKind, 'bookingConfirmed'),
              gte(schema.ledgerEntries.occurredAt, thirtyDaysAgo),
            ),
          ),

        db
          .select({ total: sum(schema.ledgerEntries.amount) })
          .from(schema.ledgerEntries)
          .where(
            and(
              eq(schema.ledgerEntries.account, 'platformCommission'),
              gte(schema.ledgerEntries.occurredAt, thirtyDaysAgo),
            ),
          ),

        db
          .select({ total: count(), amount: sum(schema.payouts.amount) })
          .from(schema.payouts)
          .where(sql`${schema.payouts.status} in ('scheduled', 'processing')`),
      ]);

      const grossMinor = toInt(gross?.total);
      // Commission legs are credits, so the balance is negative; the platform
      // earned its absolute value.
      const commissionMinor = Math.abs(toInt(commission?.total));

      return {
        today,
        currency: 'EGP',
        departuresToday: Number(departures?.total ?? 0),
        seatsBookedToday: toInt(departures?.booked),
        seatsCapacityToday: toInt(departures?.capacity),
        needsAction:
          Number(queue?.total ?? 0) +
          Number(catalogue?.total ?? 0) +
          Number(openDisputes?.total ?? 0),
        incidentsRecent: Number(recentIncidents?.total ?? 0),
        incidentsOpen: Number(unresolvedIncidents?.total ?? 0),
        expiringSoon: Number(expiring?.total ?? 0),
        blockingExpiries: Number(expiring?.blocking ?? 0),
        disputesOpen: Number(openDisputes?.total ?? 0),
        grossMinor,
        commissionMinor,
        takeRateBasisPoints:
          grossMinor === 0 ? 0 : Math.round((commissionMinor / grossMinor) * 10_000),
        payoutsDueCount: Number(due?.total ?? 0),
        payoutsDueMinor: toInt(due?.amount),
        conditions: null,
      };
    }),

  /** Everything leaving the shore on one Cairo day. */
  departures: requirePermission('booking.readAny')
    .input(
      z.object({
        locale: z.enum(LOCALES).optional(),
        /** 0 is today. The board reads a day at a time, never a range. */
        dayOffset: z.number().int().min(-30).max(30).default(0),
      }),
    )
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          startsAt: z.string(),
          serviceTitle: z.string(),
          categorySlug: z.string(),
          vendorName: z.string(),
          /** i18n keys, in the order the trip visits them. */
          siteNameKeys: z.array(z.string()),
          booked: z.number().int(),
          capacity: z.number().int(),
          isCancelled: z.boolean(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const db = requireDb(ctx);
      const locale = input.locale ?? ctx.locale;
      const day = cairoDay(new Date(ctx.now.getTime() + input.dayOffset * DAY_MS));

      const wanted = alias(schema.serviceTranslations, 'wanted_title');
      const fallback = alias(schema.serviceTranslations, 'fallback_title');

      const rows = await db
        .select({
          id: schema.availabilitySlots.id,
          startsAt: schema.availabilitySlots.startsAt,
          booked: schema.availabilitySlots.bookedCount,
          capacity: schema.availabilitySlots.capacity,
          isCancelled: schema.availabilitySlots.isCancelled,
          serviceId: schema.services.id,
          categorySlug: schema.categories.slug,
          vendorName: schema.vendors.displayName,
          title: sql<string>`coalesce(${wanted.title}, ${fallback.title})`,
        })
        .from(schema.availabilitySlots)
        .innerJoin(schema.services, eq(schema.services.id, schema.availabilitySlots.serviceId))
        .innerJoin(schema.vendors, eq(schema.vendors.id, schema.services.vendorId))
        .innerJoin(schema.categories, eq(schema.categories.id, schema.services.categoryId))
        .leftJoin(
          wanted,
          and(eq(wanted.serviceId, schema.services.id), eq(wanted.locale, locale)),
        )
        .leftJoin(
          fallback,
          and(eq(fallback.serviceId, schema.services.id), eq(fallback.locale, SOURCE_LOCALE)),
        )
        .where(eq(schema.availabilitySlots.localDate, day))
        .orderBy(asc(schema.availabilitySlots.startsAt));

      const sites = await siteNameKeysByService(
        db,
        rows.map((row) => row.serviceId),
      );

      return rows.map((row) => ({
        id: row.id,
        startsAt: row.startsAt.toISOString(),
        serviceTitle: row.title,
        categorySlug: row.categorySlug,
        vendorName: row.vendorName,
        siteNameKeys: sites.get(row.serviceId) ?? [],
        booked: row.booked,
        capacity: row.capacity,
        isCancelled: row.isCancelled,
      }));
    }),

  /**
   * A05 · every booking, newest departure first.
   *
   * The party comes from `booking_participants` rather than from the count
   * columns on the booking, because an accompanying instructor holds a seat
   * and is not one of those columns — and the seat is the number the boat's
   * headcount depends on.
   */
  bookings: requirePermission('booking.readAny')
    .input(
      z.object({
        locale: z.enum(LOCALES).optional(),
        limit: z.number().int().min(1).max(200).default(60),
      }),
    )
    .output(z.array(bookingSchema))
    .query(async ({ ctx, input }) => {
      const db = requireDb(ctx);
      const locale = input.locale ?? ctx.locale;

      const wanted = alias(schema.serviceTranslations, 'wanted_title');
      const fallback = alias(schema.serviceTranslations, 'fallback_title');

      const rows = await db
        .select({
          id: schema.bookings.id,
          reference: schema.bookings.reference,
          status: schema.bookings.status,
          startsAt: schema.bookings.startsAt,
          totalAmount: schema.bookings.totalAmount,
          totalCurrency: schema.bookings.totalCurrency,
          vendorName: schema.vendors.displayName,
          title: sql<string>`coalesce(${wanted.title}, ${fallback.title})`,
        })
        .from(schema.bookings)
        .innerJoin(schema.vendors, eq(schema.vendors.id, schema.bookings.vendorId))
        .innerJoin(schema.services, eq(schema.services.id, schema.bookings.serviceId))
        .leftJoin(
          wanted,
          and(eq(wanted.serviceId, schema.services.id), eq(wanted.locale, locale)),
        )
        .leftJoin(
          fallback,
          and(eq(fallback.serviceId, schema.services.id), eq(fallback.locale, SOURCE_LOCALE)),
        )
        .orderBy(desc(schema.bookings.startsAt))
        .limit(input.limit);

      const ids = rows.map((row) => row.id);
      // Both read off the same ids and neither needs the other, so they share
      // one round trip instead of queueing behind each other.
      const [parties, leads] = await Promise.all([
        partiesByBooking(db, ids),
        leadNamesByBooking(db, ids),
      ]);

      return rows.map((row) => ({
        id: row.id,
        reference: row.reference,
        serviceTitle: row.title,
        vendorName: row.vendorName,
        travelerName: leads.get(row.id) ?? null,
        startsAt: row.startsAt.toISOString(),
        status: row.status,
        party: parties.get(row.id) ?? {},
        totalMinor: Number(row.totalAmount),
        currency: asCurrency(row.totalCurrency),
      }));
    }),

  /**
   * What cancelling one departure actually does, before it is done.
   *
   * Weather cancels boats, and a status dropdown would let somebody cancel a
   * Thursday boat without ever seeing that it opens three refunds and leaves
   * a fourth booking to be released rather than refunded. The preview is
   * computed from the same rows the commit would touch, so the two cannot
   * drift apart.
   */
  cancellationPreview: requirePermission('booking.readAny')
    .input(z.object({ slotId: z.string().uuid(), locale: z.enum(LOCALES).optional() }))
    .output(
      z.object({
        slot: z.object({
          id: z.string().uuid(),
          startsAt: z.string(),
          serviceTitle: z.string(),
          vendorName: z.string(),
          capacity: z.number().int(),
          booked: z.number().int(),
        }),
        currency: currencySchema,
        /** Bookings that would move to `cancelledByWeather`. */
        bookings: z.array(z.object({ reference: z.string(), status: z.string() })),
        /** Captured money that would go back. */
        refunds: z.array(z.object({ reference: z.string(), amountMinor: z.number().int() })),
        /** Nothing captured, so nothing to refund — the hold is released. */
        releases: z.array(z.object({ reference: z.string(), amountMinor: z.number().int() })),
        refundTotalMinor: z.number().int(),
        /** Two legs per refund plus the commission that comes back. */
        ledgerLegs: z.number().int(),
        notifications: z.number().int(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = requireDb(ctx);
      const locale = input.locale ?? ctx.locale;

      const wanted = alias(schema.serviceTranslations, 'wanted_title');
      const fallback = alias(schema.serviceTranslations, 'fallback_title');

      const [slot] = await db
        .select({
          id: schema.availabilitySlots.id,
          startsAt: schema.availabilitySlots.startsAt,
          capacity: schema.availabilitySlots.capacity,
          booked: schema.availabilitySlots.bookedCount,
          vendorName: schema.vendors.displayName,
          title: sql<string>`coalesce(${wanted.title}, ${fallback.title})`,
        })
        .from(schema.availabilitySlots)
        .innerJoin(schema.services, eq(schema.services.id, schema.availabilitySlots.serviceId))
        .innerJoin(schema.vendors, eq(schema.vendors.id, schema.services.vendorId))
        .leftJoin(
          wanted,
          and(eq(wanted.serviceId, schema.services.id), eq(wanted.locale, locale)),
        )
        .leftJoin(
          fallback,
          and(eq(fallback.serviceId, schema.services.id), eq(fallback.locale, SOURCE_LOCALE)),
        )
        .where(eq(schema.availabilitySlots.id, input.slotId));

      if (slot === undefined) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No such departure.' });
      }

      const held = await db
        .select({
          id: schema.bookings.id,
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
            eq(schema.bookings.slotId, input.slotId),
            sql`${schema.bookings.status} in ('pendingPayment', 'confirmed', 'awaitingVendor')`,
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
    }),

  /**
   * A06 · the balance of every ledger account, as a SUM and nothing else.
   *
   * All eight are returned, including the ones nothing has touched. The
   * screen's claim is that the eight together come to zero, and a list that
   * silently omitted the empty accounts would leave that claim unverifiable —
   * the reader could not tell an account at zero from an account left out.
   */
  ledgerBalances: requirePermission('payout.manage')
    .output(
      z.array(
        z.object({
          account: z.enum(LEDGER_ACCOUNTS),
          balanceMinor: z.number().int(),
          currency: currencySchema,
          legs: z.number().int(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const db = requireDb(ctx);
      const rows = await db
        .select({
          account: schema.ledgerEntries.account,
          currency: schema.ledgerEntries.currency,
          balance: sum(schema.ledgerEntries.amount),
          legs: count(),
        })
        .from(schema.ledgerEntries)
        .groupBy(schema.ledgerEntries.account, schema.ledgerEntries.currency)
        .orderBy(asc(schema.ledgerEntries.account));

      return LEDGER_ACCOUNTS.map((account) => {
        const row = rows.find((candidate) => candidate.account === account);
        return {
          account,
          balanceMinor: toInt(row?.balance),
          // An untouched account has no currency of its own yet; it is part of
          // the same EGP book as the rest.
          currency: row === undefined ? ('EGP' as const) : asCurrency(row.currency),
          legs: Number(row?.legs ?? 0),
        };
      });
    }),

  /** A06 · the most recent events, each with the legs that make it balance. */
  ledger: requirePermission('payout.manage')
    .input(z.object({ limit: z.number().int().min(1).max(100).default(12) }))
    .output(
      z.array(
        z.object({
          entryGroupId: z.string().uuid(),
          occurredAt: z.string(),
          eventKind: z.string(),
          bookingReference: z.string().nullable(),
          legs: z.array(
            z.object({
              id: z.string().uuid(),
              account: z.string(),
              amountMinor: z.number().int(),
              currency: currencySchema,
            }),
          ),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const db = requireDb(ctx);

      // Paged by event, not by leg: paging by leg would cut an event in half,
      // and half an event never balances. The latest events are chosen in a
      // subquery rather than a first round trip — this used to be two trips
      // to eu-west-1 in a row, and the money screen waited on both.
      const latestEvents = db
        .select({ entryGroupId: schema.ledgerEntries.entryGroupId })
        .from(schema.ledgerEntries)
        .groupBy(schema.ledgerEntries.entryGroupId)
        .orderBy(desc(sql`max(${schema.ledgerEntries.occurredAt})`))
        .limit(input.limit);

      const legs = await db
        .select({
          id: schema.ledgerEntries.id,
          entryGroupId: schema.ledgerEntries.entryGroupId,
          account: schema.ledgerEntries.account,
          amount: schema.ledgerEntries.amount,
          currency: schema.ledgerEntries.currency,
          occurredAt: schema.ledgerEntries.occurredAt,
          eventKind: schema.ledgerEntries.eventKind,
          bookingReference: schema.bookings.reference,
        })
        .from(schema.ledgerEntries)
        .leftJoin(schema.bookings, eq(schema.bookings.id, schema.ledgerEntries.bookingId))
        .where(inArray(schema.ledgerEntries.entryGroupId, latestEvents))
        .orderBy(desc(schema.ledgerEntries.occurredAt), asc(schema.ledgerEntries.account));

      if (legs.length === 0) return [];

      // The event order, rebuilt from the legs that came back: newest leg in
      // each event decides where the event sits, as `max(occurred_at)` did.
      const latest = new Map<string, Date>();
      for (const leg of legs) {
        const seen = latest.get(leg.entryGroupId);
        if (seen === undefined || leg.occurredAt > seen) latest.set(leg.entryGroupId, leg.occurredAt);
      }
      const groups = [...latest]
        .map(([entryGroupId, occurredAt]) => ({ entryGroupId, occurredAt }))
        .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

      return groups.map((group) => {
        const own = legs.filter((leg) => leg.entryGroupId === group.entryGroupId);
        const first = own[0];
        return {
          entryGroupId: group.entryGroupId,
          occurredAt: new Date(group.occurredAt).toISOString(),
          eventKind: first?.eventKind ?? 'unknown',
          bookingReference: first?.bookingReference ?? null,
          legs: own.map((leg) => ({
            id: leg.id,
            account: leg.account,
            amountMinor: Number(leg.amount),
            currency: asCurrency(leg.currency),
          })),
        };
      });
    }),

  /** A06 · payments as the providers report them. */
  payments: requirePermission('payout.manage')
    .input(z.object({ limit: z.number().int().min(1).max(200).default(40) }))
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          bookingReference: z.string(),
          provider: z.string(),
          status: z.string(),
          amountMinor: z.number().int(),
          currency: currencySchema,
          at: z.string(),
          providerReference: z.string().nullable(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const db = requireDb(ctx);
      const rows = await db
        .select({
          id: schema.payments.id,
          bookingReference: schema.bookings.reference,
          provider: schema.payments.provider,
          status: schema.payments.status,
          amount: schema.payments.amount,
          currency: schema.payments.currency,
          capturedAt: schema.payments.capturedAt,
          createdAt: schema.payments.createdAt,
          providerReference: schema.payments.providerReference,
        })
        .from(schema.payments)
        .innerJoin(schema.bookings, eq(schema.bookings.id, schema.payments.bookingId))
        .orderBy(desc(schema.payments.createdAt))
        .limit(input.limit);

      return rows.map((row) => ({
        id: row.id,
        bookingReference: row.bookingReference,
        provider: row.provider,
        status: row.status,
        amountMinor: Number(row.amount),
        currency: asCurrency(row.currency),
        at: (row.capturedAt ?? row.createdAt).toISOString(),
        providerReference: row.providerReference,
      }));
    }),

  /**
   * A06 · what each operator is owed, and what came out of it.
   *
   * Gross, commission and fees are read back off the ledger for the payout's
   * own period rather than stored on the payout row. A payout keeps one
   * number — the net that left the account — and everything behind it stays
   * derivable, so a corrected ledger corrects the explanation too.
   */
  payouts: requirePermission('payout.manage')
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          vendorName: z.string(),
          provider: z.string(),
          status: z.string(),
          grossMinor: z.number().int(),
          commissionMinor: z.number().int(),
          feesMinor: z.number().int(),
          netMinor: z.number().int(),
          currency: currencySchema,
          periodStart: z.string(),
          periodEnd: z.string(),
          paidAt: z.string().nullable(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const db = requireDb(ctx);
      const rows = await db.execute<{
        id: string;
        vendor_name: string;
        provider: string;
        status: string;
        net: string;
        currency: string;
        gross: string;
        commission: string;
        fees: string;
        period_start: Date;
        period_end: Date;
        paid_at: Date | null;
      }>(sql`
        SELECT
          p.id,
          v.display_name AS vendor_name,
          a.provider,
          p.status,
          p.amount AS net,
          p.currency,
          -- Commission and the operator's share both net a refund's reversal
          -- against the booking that earned it, so a trip charged and given
          -- back inside one period contributes nothing rather than appearing
          -- twice. Gross is then their sum, which makes the four figures on
          -- the screen add up instead of merely sitting next to each other.
          COALESCE(-(
            SELECT SUM(l.amount) FROM ledger_entries l
            WHERE l.vendor_id = p.vendor_id
              AND l.account = 'platformCommission'
              AND l.event_kind IN ('bookingConfirmed', 'refundIssued')
              AND l.occurred_at BETWEEN p.period_start AND p.period_end
          ), 0) AS commission,
          COALESCE(-(
            SELECT SUM(l.amount) FROM ledger_entries l
            WHERE l.vendor_id = p.vendor_id
              AND l.account IN ('vendorPayable', 'platformCommission')
              AND l.event_kind IN ('bookingConfirmed', 'refundIssued')
              AND l.occurred_at BETWEEN p.period_start AND p.period_end
          ), 0) AS gross,
          COALESCE((
            SELECT SUM(l.amount) FROM ledger_entries l
            WHERE l.vendor_id = p.vendor_id
              AND l.account = 'paymentFees'
              AND l.occurred_at BETWEEN p.period_start AND p.period_end
          ), 0) AS fees,
          p.period_start,
          p.period_end,
          p.paid_at
        FROM payouts p
        JOIN vendors v ON v.id = p.vendor_id
        JOIN vendor_payout_accounts a ON a.id = p.payout_account_id
        ORDER BY p.period_end DESC, v.display_name ASC
      `);

      return rows.map((row) => ({
        id: row.id,
        vendorName: row.vendor_name,
        provider: row.provider,
        status: row.status,
        grossMinor: Number(row.gross),
        commissionMinor: Number(row.commission),
        feesMinor: Number(row.fees),
        netMinor: Number(row.net),
        currency: asCurrency(row.currency),
        periodStart: new Date(row.period_start).toISOString(),
        periodEnd: new Date(row.period_end).toISOString(),
        paidAt: row.paid_at === null ? null : new Date(row.paid_at).toISOString(),
      }));
    }),

  /**
   * A07 · the safety record.
   *
   * An incident is a record, not a ticket: what happened, whether the Dahab
   * chamber was involved, and what changed afterwards. The last field is the
   * one that makes the difference, and it is null while a review is open
   * rather than filled with something reassuring.
   */
  incidents: requirePermission('incident.readAny')
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          reference: z.string(),
          /**
           * The operator it happened at. The row carried only the name, so an
           * incident could be read but never opened — and an incident record
           * nobody can act from is a filing cabinet, not a safety system.
           */
          vendorId: z.string().uuid(),
          vendorName: z.string(),
          kind: z.string(),
          severity: z.enum(['nearMiss', 'minor', 'serious', 'critical']),
          occurredAt: z.string(),
          /** The dive-site slug, where the incident happened at one. */
          siteSlug: z.string().nullable(),
          chamberTreatment: z.boolean(),
          narrative: z.string(),
          resolution: z.string().nullable(),
          bookingReference: z.string().nullable(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const db = requireDb(ctx);
      const rows = await db
        .select({
          id: schema.incidents.id,
          reference: schema.incidents.reference,
          vendorId: schema.incidents.vendorId,
          vendorName: schema.vendors.displayName,
          kind: schema.incidents.kind,
          severity: schema.incidents.severity,
          occurredAt: schema.incidents.occurredAt,
          diveProfile: schema.incidents.diveProfile,
          chamberTreatment: schema.incidents.chamberTreatment,
          narrative: schema.incidents.narrative,
          resolution: schema.incidents.resolution,
          bookingReference: schema.bookings.reference,
        })
        .from(schema.incidents)
        .innerJoin(schema.vendors, eq(schema.vendors.id, schema.incidents.vendorId))
        .leftJoin(schema.bookings, eq(schema.bookings.id, schema.incidents.bookingId))
        .orderBy(desc(schema.incidents.occurredAt));

      return rows.map((row) => ({
        id: row.id,
        reference: row.reference,
        vendorId: row.vendorId,
        vendorName: row.vendorName,
        kind: row.kind,
        severity: row.severity,
        occurredAt: row.occurredAt.toISOString(),
        siteSlug: readSiteSlug(row.diveProfile),
        chamberTreatment: row.chamberTreatment,
        narrative: row.narrative,
        resolution: row.resolution,
        bookingReference: row.bookingReference,
      }));
    }),

  /** A07 · money in contention. */
  disputes: requirePermission('booking.readAny')
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          bookingReference: z.string(),
          vendorName: z.string(),
          status: z.string(),
          reasonKey: z.string(),
          description: z.string(),
          claimedMinor: z.number().int().nullable(),
          resolvedMinor: z.number().int().nullable(),
          currency: currencySchema,
          openedAt: z.string(),
          resolutionNote: z.string().nullable(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const db = requireDb(ctx);
      const rows = await db
        .select({
          id: schema.disputes.id,
          bookingReference: schema.bookings.reference,
          vendorName: schema.vendors.displayName,
          status: schema.disputes.status,
          reasonKey: schema.disputes.reasonKey,
          description: schema.disputes.description,
          claimedAmount: schema.disputes.claimedAmount,
          resolvedAmount: schema.disputes.resolvedAmount,
          claimedCurrency: schema.disputes.claimedCurrency,
          createdAt: schema.disputes.createdAt,
          resolutionNote: schema.disputes.resolutionNote,
        })
        .from(schema.disputes)
        .innerJoin(schema.bookings, eq(schema.bookings.id, schema.disputes.bookingId))
        .innerJoin(schema.vendors, eq(schema.vendors.id, schema.bookings.vendorId))
        .orderBy(desc(schema.disputes.createdAt));

      return rows.map((row) => ({
        id: row.id,
        bookingReference: row.bookingReference,
        vendorName: row.vendorName,
        status: row.status,
        reasonKey: row.reasonKey,
        description: row.description,
        claimedMinor: row.claimedAmount === null ? null : Number(row.claimedAmount),
        resolvedMinor: row.resolvedAmount === null ? null : Number(row.resolvedAmount),
        currency: asCurrency(row.claimedCurrency),
        openedAt: row.createdAt.toISOString(),
        resolutionNote: row.resolutionNote,
      }));
    }),

  /** A07 · reviews a moderator still owes an answer on. */
  moderationQueue: requirePermission('review.moderate')
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          vendorName: z.string(),
          rating: z.number().int(),
          sourceLocale: z.string(),
          status: z.enum(['published', 'pendingReview', 'hidden', 'removed']),
          title: z.string().nullable(),
          body: z.string().nullable(),
          at: z.string(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const db = requireDb(ctx);
      const rows = await db
        .select({
          id: schema.reviews.id,
          vendorName: schema.vendors.displayName,
          rating: schema.reviews.rating,
          sourceLocale: schema.reviews.sourceLocale,
          status: schema.reviews.moderationStatus,
          createdAt: schema.reviews.createdAt,
          title: schema.reviewTranslations.title,
          body: schema.reviewTranslations.body,
        })
        .from(schema.reviews)
        .innerJoin(schema.vendors, eq(schema.vendors.id, schema.reviews.vendorId))
        .leftJoin(
          schema.reviewTranslations,
          and(
            eq(schema.reviewTranslations.reviewId, schema.reviews.id),
            eq(schema.reviewTranslations.locale, schema.reviews.sourceLocale),
          ),
        )
        .where(ne(schema.reviews.moderationStatus, 'published'))
        .orderBy(desc(schema.reviews.createdAt));

      return rows.map((row) => ({
        id: row.id,
        vendorName: row.vendorName,
        rating: row.rating,
        sourceLocale: row.sourceLocale,
        status: row.status,
        title: row.title,
        body: row.body,
        at: row.createdAt.toISOString(),
      }));
    }),

  /** A04 · the taxonomy overview, one row per category. */
  categories: requirePermission('taxonomy.manage')
    .output(
      z.array(
        z.object({
          slug: z.string(),
          nameKey: z.string(),
          attributes: z.number().int(),
          comparable: z.number().int(),
          services: z.number().int(),
          publishedServices: z.number().int(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const db = requireDb(ctx);

      const definitionCounts = db
        .select({
          categoryId: schema.attributeDefinitions.categoryId,
          total: count().as('definition_total'),
          comparable:
            sql<number>`count(*) filter (where ${schema.attributeDefinitions.isComparable})::int`.as(
              'definition_comparable',
            ),
        })
        .from(schema.attributeDefinitions)
        .groupBy(schema.attributeDefinitions.categoryId)
        .as('definition_counts');

      const serviceCounts = db
        .select({
          categoryId: schema.services.categoryId,
          total: count().as('category_service_total'),
          published:
            sql<number>`count(*) filter (where ${schema.services.status} = 'published')::int`.as(
              'category_service_published',
            ),
        })
        .from(schema.services)
        .groupBy(schema.services.categoryId)
        .as('category_service_counts');

      const rows = await db
        .select({
          slug: schema.categories.slug,
          nameKey: schema.categories.nameKey,
          sortOrder: schema.categories.sortOrder,
          attributes: definitionCounts.total,
          comparable: definitionCounts.comparable,
          services: serviceCounts.total,
          published: serviceCounts.published,
        })
        .from(schema.categories)
        .leftJoin(definitionCounts, eq(definitionCounts.categoryId, schema.categories.id))
        .leftJoin(serviceCounts, eq(serviceCounts.categoryId, schema.categories.id))
        .orderBy(asc(schema.categories.sortOrder));

      return rows.map((row) => ({
        slug: row.slug,
        nameKey: row.nameKey,
        attributes: Number(row.attributes ?? 0),
        comparable: Number(row.comparable ?? 0),
        services: Number(row.services ?? 0),
        publishedServices: Number(row.published ?? 0),
      }));
    }),

  /**
   * A04 · listings waiting on a decision.
   *
   * `missingComparable` is the number that matters: a service cannot enter a
   * comparison table until it has answered every comparable attribute its
   * category defines, and until then publishing it makes the comparison worse
   * rather than richer.
   *
   * Gated on `catalog.publishAny`, the same as the decision it feeds. It was
   * `catalog.publish`, which every vendor owner holds over their own listings,
   * and this query has no vendor filter — so any owner could read every other
   * operator's drafts. `tests/admin-scope.test.ts` sweeps `admin.*` for this.
   */
  serviceQueue: requirePermission('catalog.publishAny')
    .input(z.object({ locale: z.enum(LOCALES).optional() }))
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          title: z.string(),
          vendorName: z.string(),
          categorySlug: z.string(),
          status: z.enum(['draft', 'underReview', 'published', 'paused', 'archived', 'rejected']),
          submittedAt: z.string(),
          missingComparable: z.number().int(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const db = requireDb(ctx);
      const locale = input.locale ?? ctx.locale;

      const wanted = alias(schema.serviceTranslations, 'wanted_title');
      const fallback = alias(schema.serviceTranslations, 'fallback_title');

      const rows = await db
        .select({
          id: schema.services.id,
          status: schema.services.status,
          createdAt: schema.services.createdAt,
          vendorName: schema.vendors.displayName,
          categorySlug: schema.categories.slug,
          title: sql<string>`coalesce(${wanted.title}, ${fallback.title})`,
          // Comparable definitions the category declares, minus the ones this
          // service has answered. Counted in SQL so a service with forty
          // attributes does not arrive as forty rows.
          missing: sql<number>`(
            SELECT count(*)::int
            FROM attribute_definitions d
            WHERE d.category_id = ${schema.services.categoryId}
              AND d.is_comparable
              AND NOT EXISTS (
                SELECT 1 FROM service_attribute_values v
                WHERE v.service_id = ${schema.services.id}
                  AND v.attribute_definition_id = d.id
              )
          )`,
        })
        .from(schema.services)
        .innerJoin(schema.vendors, eq(schema.vendors.id, schema.services.vendorId))
        .innerJoin(schema.categories, eq(schema.categories.id, schema.services.categoryId))
        .leftJoin(
          wanted,
          and(eq(wanted.serviceId, schema.services.id), eq(wanted.locale, locale)),
        )
        .leftJoin(
          fallback,
          and(eq(fallback.serviceId, schema.services.id), eq(fallback.locale, SOURCE_LOCALE)),
        )
        .where(sql`${schema.services.status} in ('draft', 'underReview', 'rejected')`)
        .orderBy(desc(schema.services.createdAt));

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        vendorName: row.vendorName,
        categorySlug: row.categorySlug,
        status: row.status,
        submittedAt: row.createdAt.toISOString(),
        missingComparable: Number(row.missing),
      }));
    }),

  /** A08 · the geography, with the hazard that decides who may dive it. */
  diveSites: requirePermission('taxonomy.manage')
    .output(
      z.array(
        z.object({
          slug: z.string(),
          nameKey: z.string(),
          /** Nullable: a site can be catalogued before it is surveyed. */
          minDepthMetres: z.number().int().nullable(),
          maxDepthMetres: z.number().int().nullable(),
          difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'technical']),
          entryType: z.enum(['shore', 'boat', 'both']),
          requiresCertification: z.string().nullable(),
          hazards: z.array(z.string()),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const db = requireDb(ctx);
      const rows = await db
        .select({
          slug: schema.diveSites.slug,
          nameKey: schema.diveSites.nameKey,
          minDepthMetres: schema.diveSites.minDepthMetres,
          maxDepthMetres: schema.diveSites.maxDepthMetres,
          difficulty: schema.diveSites.difficulty,
          entryType: schema.diveSites.entryType,
          requiresCertification: schema.diveSites.requiresCertification,
          hazards: schema.diveSites.hazards,
        })
        .from(schema.diveSites)
        .orderBy(desc(schema.diveSites.maxDepthMetres));

      return rows.map((row) => ({
        slug: row.slug,
        nameKey: row.nameKey,
        minDepthMetres: row.minDepthMetres,
        maxDepthMetres: row.maxDepthMetres,
        difficulty: row.difficulty,
        entryType: row.entryType,
        requiresCertification: row.requiresCertification,
        hazards: row.hazards ?? [],
      }));
    }),

  /** A08 · the flags, and how far each one is turned up. */
  featureFlags: requirePermission('featureFlag.manage')
    .output(
      z.array(
        z.object({
          key: z.string(),
          description: z.string(),
          isEnabled: z.boolean(),
          rolloutPercentage: z.number().int(),
          /** Explicit allow lists are evaluated before the percentage. */
          pinnedUsers: z.number().int(),
          pinnedVendors: z.number().int(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const db = requireDb(ctx);
      const rows = await db
        .select()
        .from(schema.featureFlags)
        .orderBy(asc(schema.featureFlags.key));

      return rows.map((row) => ({
        key: row.key,
        description: row.description,
        isEnabled: row.isEnabled,
        rolloutPercentage: row.rolloutPercentage,
        pinnedUsers: row.enabledForUserIds.length,
        pinnedVendors: row.enabledForVendorIds.length,
      }));
    }),

  /**
   * A08 · how far vendor-authored content has reached each locale.
   *
   * This counts the tables an operator writes into — service and review text
   * — not the interface strings, which are a build gate rather than an
   * operational number. `machine` is honest about being machine: the traveler
   * app offers "show original" for exactly those rows.
   */
  translationCoverage: requirePermission('taxonomy.manage')
    .output(
      z.array(
        z.object({
          locale: z.enum(LOCALES),
          services: z.number().int(),
          human: z.number().int(),
          machine: z.number().int(),
          missing: z.number().int(),
          reviews: z.number().int(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const db = requireDb(ctx);

      const [services] = await db.select({ total: count() }).from(schema.services);
      const total = Number(services?.total ?? 0);

      const serviceRows = await db
        .select({
          locale: schema.serviceTranslations.locale,
          human: sql<number>`count(*) filter (where ${schema.serviceTranslations.status} = 'human')::int`,
          machine: sql<number>`count(*) filter (where ${schema.serviceTranslations.status} = 'machine')::int`,
        })
        .from(schema.serviceTranslations)
        .groupBy(schema.serviceTranslations.locale);

      const reviewRows = await db
        .select({ locale: schema.reviewTranslations.locale, total: count() })
        .from(schema.reviewTranslations)
        .groupBy(schema.reviewTranslations.locale);

      return LOCALES.map((locale) => {
        const service = serviceRows.find((row) => row.locale === locale);
        const human = Number(service?.human ?? 0);
        const machine = Number(service?.machine ?? 0);
        return {
          locale,
          services: total,
          human,
          machine,
          missing: Math.max(total - human - machine, 0),
          reviews: Number(reviewRows.find((row) => row.locale === locale)?.total ?? 0),
        };
      });
    }),

  // The writes live in their own file: every one of them requires a reason,
  // runs in a transaction and leaves an audit row, and keeping those three
  // rules in one place is what stops a fourth write being added without them.
  ...adminWritesRouter,

  // Travellers, and the operator record seen whole — the two things the
  // console could never open.
  ...adminPeopleRouter,

  // Accounts, roles and operator status — the console's writes on people.
  ...adminUserWritesRouter,
});

// --- Shared shapes and small helpers -------------------------------------


/**
 * Postgres returns `sum()` and `bigint` as strings through the driver, because
 * a bigint does not always survive a double. Every total here fits in a
 * JavaScript integer by construction — piastres, not atoms — so the narrowing
 * is safe, but it has to be deliberate rather than accidental.
 */
function toInt(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Math.round(Number(value));
}

function readSiteSlug(profile: Record<string, unknown> | null): string | null {
  if (profile === null) return null;
  const site = profile['site'];
  return typeof site === 'string' ? site : null;
}

async function siteNameKeysByService(
  db: NonNullable<Context['db']>,
  serviceIds: readonly string[],
): Promise<Map<string, string[]>> {
  const byService = new Map<string, string[]>();
  if (serviceIds.length === 0) return byService;

  const rows = await db
    .select({
      serviceId: schema.serviceDiveSites.serviceId,
      nameKey: schema.diveSites.nameKey,
    })
    .from(schema.serviceDiveSites)
    .innerJoin(schema.diveSites, eq(schema.diveSites.id, schema.serviceDiveSites.diveSiteId))
    .where(inArray(schema.serviceDiveSites.serviceId, [...serviceIds]))
    .orderBy(asc(schema.serviceDiveSites.sortOrder));

  for (const row of rows) {
    const list = byService.get(row.serviceId) ?? [];
    list.push(row.nameKey);
    byService.set(row.serviceId, list);
  }
  return byService;
}

async function partiesByBooking(
  db: NonNullable<Context['db']>,
  bookingIds: readonly string[],
): Promise<Map<string, Record<string, number>>> {
  const byBooking = new Map<string, Record<string, number>>();
  if (bookingIds.length === 0) return byBooking;

  const rows = await db
    .select({
      bookingId: schema.bookingParticipants.bookingId,
      kind: schema.bookingParticipants.kind,
      total: count(),
    })
    .from(schema.bookingParticipants)
    .where(inArray(schema.bookingParticipants.bookingId, [...bookingIds]))
    .groupBy(schema.bookingParticipants.bookingId, schema.bookingParticipants.kind);

  for (const row of rows) {
    const party = byBooking.get(row.bookingId) ?? {};
    party[row.kind] = Number(row.total);
    byBooking.set(row.bookingId, party);
  }
  return byBooking;
}

/**
 * Who to put in the traveller column.
 *
 * Only the person who booked has a name here: companion names are collected
 * at check-in, so the manifest is honestly incomplete rather than filled in
 * with something invented.
 */
async function leadNamesByBooking(
  db: NonNullable<Context['db']>,
  bookingIds: readonly string[],
): Promise<Map<string, string>> {
  const byBooking = new Map<string, string>();
  if (bookingIds.length === 0) return byBooking;

  const rows = await db
    .select({
      bookingId: schema.bookingParticipants.bookingId,
      fullName: schema.bookingParticipants.fullName,
      userId: schema.bookingParticipants.userId,
    })
    .from(schema.bookingParticipants)
    .where(
      and(
        inArray(schema.bookingParticipants.bookingId, [...bookingIds]),
        isNotNull(schema.bookingParticipants.userId),
      ),
    );

  for (const row of rows) {
    if (!byBooking.has(row.bookingId)) byBooking.set(row.bookingId, row.fullName);
  }
  return byBooking;
}

function toDocument(row: {
  id: string;
  vendorId: string;
  vendorName: string;
  type: string;
  status: 'pending' | 'inReview' | 'verified' | 'rejected' | 'expired';
  expiresOn: string | null;
  documentNumber: string | null;
  issuedOn: string | null;
  issuer: string | null;
  blocksPublishing: boolean;
}) {
  return {
    id: row.id,
    vendorId: row.vendorId,
    vendorName: row.vendorName,
    type: row.type,
    status: row.status,
    expiresOn: row.expiresOn,
    issuer: row.issuer,
    documentNumber: row.documentNumber,
    issuedOn: row.issuedOn,
    blocksPublishing: row.blocksPublishing,
  };
}
