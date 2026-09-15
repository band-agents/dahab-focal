import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';

import { commissionMinor, currencySchema, paymentFeeMinor } from '@dahab/api-contract';
import type { CurrencyCode } from '@dahab/i18n';
import { schema } from '@dahab/db';
import { LOCALES, SOURCE_LOCALE } from '@dahab/i18n';

import { commitCancellation, previewCancellation } from '../operations/cancel-departure.ts';
import { requireDatabase } from '../database.ts';
import { requireVendorPermission, router } from '../trpc.ts';

/**
 * The operator app's reads.
 *
 * Every procedure here is a `requireVendorPermission`, which does two things
 * the admin router's `requirePermission` does not: it refuses a session that
 * is not acting for a vendor, and it pins `ctx.vendorId` from the session
 * itself. **No procedure below takes a vendorId as input.** That is the whole
 * safety property — a vendor id in an input is a vendor id an operator can
 * change, and one operator reading another's manifest is the failure this
 * router exists to make impossible rather than merely unlikely.
 *
 * The permission split is the product's defining one. `vendorStaff` holds
 * `booking.readVendor` and `resource.manage`; `vendorOwner` adds
 * `payout.readOwn` and `staff.manage`. So a guide's app has no money screen
 * because the procedure behind it refuses them, not because a tab was hidden.
 */

const DAY_MS = 86_400_000;

/** The Cairo calendar day an instant falls on, as YYYY-MM-DD. */
function cairoDay(at: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(at);
}

const moneySchema = z.object({
  amountMinor: z.number().int(),
  currency: currencySchema,
});

const participantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  kind: z.enum(['adult', 'child', 'infant', 'student', 'resident', 'instructor']),
  /** What they presented. Null where the service needs none. */
  certification: z.string().nullable(),
  waiverSigned: z.boolean(),
  /** Shown to the guide who needs it and to nobody else. */
  medicalFlag: z.boolean(),
});

const departureSchema = z.object({
  id: z.string().uuid(),
  startsAt: z.string(),
  serviceTitle: z.string(),
  categorySlug: z.string(),
  siteNameKeys: z.array(z.string()),
  capacity: z.number().int(),
  isCancelled: z.boolean(),
  participants: z.array(participantSchema),
});

export const vendorRouter = router({
  /**
   * V01 · everything leaving this operator's shore on one Cairo day, with the
   * manifest for each.
   *
   * The manifest is the point. A departure row with a headcount is a number;
   * what a guide needs at the dock is the names, what each of them presented,
   * and which of them has not signed. Assembled in two queries rather than
   * one per departure, because a dive centre with six boats out should not
   * cost six round trips on a phone with one bar of signal.
   */
  today: requireVendorPermission('booking.readVendor')
    .input(
      z
        .object({
          locale: z.enum(LOCALES).optional(),
          /** 0 is today, in Cairo. The board reads a day at a time. */
          dayOffset: z.number().int().min(-30).max(30).default(0),
        })
        .default({}),
    )
    .output(z.array(departureSchema))
    .query(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);
      const locale = input.locale ?? ctx.locale;
      const day = cairoDay(new Date(ctx.now.getTime() + input.dayOffset * DAY_MS));

      const wanted = alias(schema.serviceTranslations, 'wanted_title');
      const fallback = alias(schema.serviceTranslations, 'fallback_title');

      const departures = await db
        .select({
          id: schema.availabilitySlots.id,
          startsAt: schema.availabilitySlots.startsAt,
          capacity: schema.availabilitySlots.capacity,
          isCancelled: schema.availabilitySlots.isCancelled,
          categorySlug: schema.categories.slug,
          title: sql<string>`coalesce(${wanted.title}, ${fallback.title})`,
        })
        .from(schema.availabilitySlots)
        .innerJoin(schema.services, eq(schema.services.id, schema.availabilitySlots.serviceId))
        .innerJoin(schema.categories, eq(schema.categories.id, schema.services.categoryId))
        .leftJoin(
          wanted,
          and(eq(wanted.serviceId, schema.services.id), eq(wanted.locale, locale)),
        )
        .leftJoin(
          fallback,
          and(eq(fallback.serviceId, schema.services.id), eq(fallback.locale, SOURCE_LOCALE)),
        )
        .where(
          and(
            // From the session, never from an input.
            eq(schema.services.vendorId, ctx.vendorId),
            eq(schema.availabilitySlots.localDate, day),
          ),
        )
        .orderBy(asc(schema.availabilitySlots.startsAt));

      if (departures.length === 0) return [];

      const slotIds = departures.map((departure) => departure.id);

      // One query for every manifest on the day. A waiver is matched to its
      // participant, so "signed" means this person signed — not that somebody
      // on the booking did.
      const people = await db
        .select({
          id: schema.bookingParticipants.id,
          slotId: schema.bookings.slotId,
          name: schema.bookingParticipants.fullName,
          kind: schema.bookingParticipants.kind,
          medicalFlag: schema.bookingParticipants.medicalFlag,
          certification: sql<string | null>`
            ${schema.bookingParticipants.certificationSnapshot} ->> 'level'
          `,
          waiverSigned: sql<boolean>`exists (
            select 1 from ${schema.waivers}
            where ${schema.waivers.participantId} = ${schema.bookingParticipants.id}
          )`,
        })
        .from(schema.bookingParticipants)
        .innerJoin(schema.bookings, eq(schema.bookings.id, schema.bookingParticipants.bookingId))
        .where(
          and(
            inArray(schema.bookings.slotId, slotIds),
            // A cancelled booking's people are not on the boat, and a guide
            // reading their names off the manifest would look for them.
            inArray(schema.bookings.status, ['pendingPayment', 'confirmed', 'awaitingVendor']),
          ),
        )
        .orderBy(asc(schema.bookingParticipants.fullName));

      const sites = await db
        .select({
          slotId: schema.availabilitySlots.id,
          nameKey: schema.diveSites.nameKey,
          sortOrder: schema.serviceDiveSites.sortOrder,
        })
        .from(schema.availabilitySlots)
        .innerJoin(
          schema.serviceDiveSites,
          eq(schema.serviceDiveSites.serviceId, schema.availabilitySlots.serviceId),
        )
        .innerJoin(schema.diveSites, eq(schema.diveSites.id, schema.serviceDiveSites.diveSiteId))
        .where(inArray(schema.availabilitySlots.id, slotIds))
        .orderBy(asc(schema.serviceDiveSites.sortOrder));

      return departures.map((departure) => ({
        id: departure.id,
        startsAt: departure.startsAt.toISOString(),
        serviceTitle: departure.title,
        categorySlug: departure.categorySlug,
        siteNameKeys: sites
          .filter((site) => site.slotId === departure.id)
          .map((site) => site.nameKey),
        capacity: departure.capacity,
        isCancelled: departure.isCancelled,
        participants: people
          .filter((person) => person.slotId === departure.id)
          .map((person) => ({
            id: person.id,
            name: person.name,
            kind: person.kind,
            certification: person.certification,
            waiverSigned: Boolean(person.waiverSigned),
            medicalFlag: person.medicalFlag,
          })),
      }));
    }),

  /** V02 · this operator's bookings, newest departure first. */
  bookings: requireVendorPermission('booking.readVendor')
    .input(
      z
        .object({
          locale: z.enum(LOCALES).optional(),
          limit: z.number().int().min(1).max(200).default(60),
        })
        .default({}),
    )
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          reference: z.string(),
          serviceTitle: z.string(),
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
          /** Seats held, which is what the boat depends on. */
          heads: z.number().int(),
          total: moneySchema,
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);
      const locale = input.locale ?? ctx.locale;

      const wanted = alias(schema.serviceTranslations, 'wanted_title');
      const fallback = alias(schema.serviceTranslations, 'fallback_title');

      const rows = await db
        .select({
          id: schema.bookings.id,
          reference: schema.bookings.reference,
          status: schema.bookings.status,
          startsAt: schema.availabilitySlots.startsAt,
          totalAmount: schema.bookings.totalAmount,
          totalCurrency: schema.bookings.totalCurrency,
          title: sql<string>`coalesce(${wanted.title}, ${fallback.title})`,
          travelerName: schema.userProfiles.displayName,
          heads: sql<number>`(
            select count(*) from ${schema.bookingParticipants}
            where ${schema.bookingParticipants.bookingId} = ${schema.bookings.id}
          )::int`,
        })
        .from(schema.bookings)
        .innerJoin(schema.services, eq(schema.services.id, schema.bookings.serviceId))
        .innerJoin(
          schema.availabilitySlots,
          eq(schema.availabilitySlots.id, schema.bookings.slotId),
        )
        .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.bookings.userId))
        .leftJoin(
          wanted,
          and(eq(wanted.serviceId, schema.services.id), eq(wanted.locale, locale)),
        )
        .leftJoin(
          fallback,
          and(eq(fallback.serviceId, schema.services.id), eq(fallback.locale, SOURCE_LOCALE)),
        )
        .where(eq(schema.services.vendorId, ctx.vendorId))
        .orderBy(asc(schema.availabilitySlots.startsAt))
        .limit(input.limit);

      return rows.map((row) => ({
        id: row.id,
        reference: row.reference,
        serviceTitle: row.title,
        travelerName: row.travelerName,
        startsAt: row.startsAt.toISOString(),
        status: row.status,
        heads: Number(row.heads),
        total: {
          amountMinor: Number(row.totalAmount),
          // char(3) comes back as a plain string; the contract is an enum.
          currency: row.totalCurrency as CurrencyCode,
        },
      }));
    }),

  /**
   * V03 · this operator's catalogue, with what stops each listing being
   * compared.
   *
   * `missingComparable` is the number that matters on this screen: a service
   * with unanswered comparable attributes does not appear on the traveller's
   * comparison table, which is the product's whole premise, and the operator
   * is the only person who can answer them.
   */
  services: requireVendorPermission('catalog.read')
    .input(z.object({ locale: z.enum(LOCALES).optional() }).default({}))
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          title: z.string(),
          categorySlug: z.string(),
          status: z.enum(['draft', 'underReview', 'published', 'paused', 'archived', 'rejected']),
          missingComparable: z.number().int(),
          /** Null where no pricing model has been set up yet. */
          fromPrice: moneySchema.nullable(),
          /**
           * The inclusion keys this service has answered yes to.
           *
           * These are `attribute_definitions` rows in the `inclusions` group,
           * not a free-text list — which is the point. The hidden-cost
           * detector normalises every operator's inclusions onto one axis, so
           * declaring them fully is what makes a listing rank rather than
           * what costs it.
           */
          inclusions: z.array(z.string()),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);
      const locale = input.locale ?? ctx.locale;

      const wanted = alias(schema.serviceTranslations, 'wanted_title');
      const fallback = alias(schema.serviceTranslations, 'fallback_title');

      const rows = await db
        .select({
          id: schema.services.id,
          status: schema.services.status,
          categorySlug: schema.categories.slug,
          title: sql<string>`coalesce(${wanted.title}, ${fallback.title})`,
          missing: sql<number>`(
            select count(*) from ${schema.attributeDefinitions} ad
            where ad.category_id = ${schema.services.categoryId}
              and ad.is_comparable
              and not exists (
                select 1 from ${schema.serviceAttributeValues} sav
                where sav.service_id = ${schema.services.id}
                  and sav.attribute_definition_id = ad.id
              )
          )::int`,
        })
        .from(schema.services)
        .innerJoin(schema.categories, eq(schema.categories.id, schema.services.categoryId))
        .leftJoin(
          wanted,
          and(eq(wanted.serviceId, schema.services.id), eq(wanted.locale, locale)),
        )
        .leftJoin(
          fallback,
          and(eq(fallback.serviceId, schema.services.id), eq(fallback.locale, SOURCE_LOCALE)),
        )
        .where(eq(schema.services.vendorId, ctx.vendorId))
        .orderBy(asc(schema.services.createdAt));

      if (rows.length === 0) return [];
      const serviceIds = rows.map((row) => row.id);

      const [prices, inclusions] = await Promise.all([
        db
          .select({
            serviceId: schema.pricingModels.serviceId,
            amount: schema.pricingModels.basePriceAmount,
            currency: schema.pricingModels.basePriceCurrency,
          })
          .from(schema.pricingModels)
          .where(inArray(schema.pricingModels.serviceId, serviceIds)),

        // Only the ones answered yes. An unanswered inclusion and one
        // answered "no" are different facts, and neither belongs on a list of
        // what the price covers.
        db
          .select({
            serviceId: schema.serviceAttributeValues.serviceId,
            key: schema.attributeDefinitions.key,
          })
          .from(schema.serviceAttributeValues)
          .innerJoin(
            schema.attributeDefinitions,
            eq(
              schema.attributeDefinitions.id,
              schema.serviceAttributeValues.attributeDefinitionId,
            ),
          )
          .where(
            and(
              inArray(schema.serviceAttributeValues.serviceId, serviceIds),
              eq(schema.attributeDefinitions.comparisonGroup, 'inclusions'),
              eq(schema.serviceAttributeValues.valueBool, true),
            ),
          )
          .orderBy(asc(schema.attributeDefinitions.sortOrder)),
      ]);

      return rows.map((row) => {
        const price = prices.find((candidate) => candidate.serviceId === row.id);
        return {
          id: row.id,
          title: row.title,
          categorySlug: row.categorySlug,
          status: row.status,
          missingComparable: Number(row.missing),
          fromPrice:
            price === undefined
              ? null
              : {
                  amountMinor: Number(price.amount),
                  currency: price.currency as CurrencyCode,
                },
          inclusions: inclusions
            .filter((inclusion) => inclusion.serviceId === row.id)
            .map((inclusion) => inclusion.key),
        };
      });
    }),

  /**
   * V02 · what cancelling this departure would touch, before it does.
   *
   * Scoped to the session's own operator, so a slot belonging to anyone else
   * reads as NOT_FOUND. The cascade itself is the same code the console runs
   * — one implementation, two entry points differing only in who may.
   */
  cancellationPreview: requireVendorPermission('booking.manageVendor')
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
        bookings: z.array(z.object({ reference: z.string(), status: z.string() })),
        refunds: z.array(z.object({ reference: z.string(), amountMinor: z.number().int() })),
        releases: z.array(z.object({ reference: z.string(), amountMinor: z.number().int() })),
        refundTotalMinor: z.number().int(),
        ledgerLegs: z.number().int(),
        notifications: z.number().int(),
      }),
    )
    .query(async ({ ctx, input }) =>
      previewCancellation(
        requireDatabase(ctx.db),
        input.slotId,
        ctx.vendorId,
        input.locale ?? ctx.locale,
      ),
    ),

  /**
   * V02 · commit it.
   *
   * `booking.manageVendor` is in vendorStaff as well as vendorOwner, which is
   * deliberate: the person at the dock in the wind is the one who knows the
   * sea is unworkable, and making them phone the owner first is how a boat
   * goes out that should not have.
   *
   * The reason reaches the operator's own record, every traveller's refund,
   * and the audit log — the same three places the console's does.
   */
  cancelDeparture: requireVendorPermission('booking.manageVendor')
    .input(
      z.object({
        slotId: z.string().uuid(),
        reason: z.string().trim().min(8).max(2000),
      }),
    )
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
      const result = await commitCancellation(requireDatabase(ctx.db), ctx, {
        slotId: input.slotId,
        reason: input.reason,
        // From the session. This is the whole difference from the console's.
        scopeToVendor: ctx.vendorId,
        actorKind: 'vendor',
      });
      const { cascadeId: _cascadeId, ...wire } = result;
      return wire;
    }),

  /**
   * V05 · what this operator earned, and what is still owed.
   *
   * `payout.readOwn` — so a guide cannot reach it. Gross comes from captured
   * payments; commission and the provider fee are derived with the same
   * functions the ledger and the console use, because a vendor being shown a
   * different number from the one the platform books is how trust goes.
   */
  earnings: requireVendorPermission('payout.readOwn')
    .input(z.object({ days: z.number().int().min(1).max(365).default(30) }).default({}))
    .output(
      z.object({
        fromDay: z.string(),
        toDay: z.string(),
        gross: moneySchema,
        commission: moneySchema,
        fees: moneySchema,
        net: moneySchema,
        /** Null when nothing is scheduled — which is not the same as zero. */
        nextPayoutOn: z.string().nullable(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);
      const from = new Date(ctx.now.getTime() - input.days * DAY_MS);

      const [captured] = await db
        .select({
          gross: sql<string>`coalesce(sum(${schema.payments.amount}), 0)`,
          currency: sql<string>`coalesce(max(${schema.payments.currency}), 'EGP')`,
        })
        .from(schema.payments)
        .innerJoin(schema.bookings, eq(schema.bookings.id, schema.payments.bookingId))
        .innerJoin(schema.services, eq(schema.services.id, schema.bookings.serviceId))
        .where(
          and(
            eq(schema.services.vendorId, ctx.vendorId),
            eq(schema.payments.status, 'captured'),
            gte(schema.payments.createdAt, from),
            lte(schema.payments.createdAt, ctx.now),
          ),
        );

      const gross = Number(captured?.gross ?? 0);
      const currency = (captured?.currency ?? 'EGP') as 'EGP';
      const commission = commissionMinor(gross);
      const fees = paymentFeeMinor(gross);

      const [next] = await db
        .select({ periodEnd: schema.payouts.periodEnd })
        .from(schema.payouts)
        .where(
          and(
            eq(schema.payouts.vendorId, ctx.vendorId),
            inArray(schema.payouts.status, ['scheduled', 'processing']),
          ),
        )
        .orderBy(asc(schema.payouts.periodEnd))
        .limit(1);

      return {
        fromDay: cairoDay(from),
        toDay: cairoDay(ctx.now),
        gross: { amountMinor: gross, currency },
        commission: { amountMinor: commission, currency },
        fees: { amountMinor: fees, currency },
        // What actually reaches the bank: gross less the platform's cut and
        // the provider's. Computed, never stored, so it cannot drift.
        net: { amountMinor: gross - commission - fees, currency },
        nextPayoutOn: next === undefined ? null : cairoDay(next.periodEnd),
      };
    }),

  /**
   * V06 · the team, and the ratings that gate who can be assigned.
   *
   * A lapsed instructor rating is a refusal, not a warning: the person cannot
   * be put on a manifest as guide. `lapsed` is computed against Cairo today
   * rather than stored, because a date that was valid when it was written
   * stops being valid without anything running.
   */
  staff: requireVendorPermission('staff.manage')
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          name: z.string(),
          jobTitle: z.string().nullable(),
          rating: z.string().nullable(),
          expiresOn: z.string().nullable(),
          lapsed: z.boolean(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const db = requireDatabase(ctx.db);
      const today = cairoDay(ctx.now);

      const rows = await db
        .select({
          id: schema.staff.id,
          name: schema.staff.fullName,
          jobTitle: schema.staff.jobTitle,
          agency: schema.staffCertifications.agency,
          level: schema.staffCertifications.level,
          expiresOn: schema.staffCertifications.expiresOn,
        })
        .from(schema.staff)
        .leftJoin(
          schema.staffCertifications,
          eq(schema.staffCertifications.staffId, schema.staff.id),
        )
        .where(and(eq(schema.staff.vendorId, ctx.vendorId), eq(schema.staff.isActive, true)))
        .orderBy(asc(schema.staff.fullName), asc(schema.staffCertifications.expiresOn));

      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        jobTitle: row.jobTitle,
        rating: row.level === null ? null : `${row.agency ?? ''} ${row.level}`.trim(),
        expiresOn: row.expiresOn,
        lapsed: row.expiresOn !== null && row.expiresOn < today,
      }));
    }),

  /**
   * V07 · equipment, and what is out of test.
   *
   * A cylinder past its hydrostatic date cannot legally be filled, so
   * `blocked` is a hard gate on availability rather than a maintenance note.
   * Only the earliest expiry per resource matters — one lapsed certificate
   * takes the item out regardless of what else is in date.
   */
  resources: requireVendorPermission('resource.manage')
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          label: z.string(),
          kind: z.string(),
          dueOn: z.string().nullable(),
          blocked: z.boolean(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const db = requireDatabase(ctx.db);
      const today = cairoDay(ctx.now);

      const rows = await db
        .select({
          id: schema.resources.id,
          name: schema.resources.name,
          identifier: schema.resources.identifier,
          kind: schema.resources.kind,
          dueOn: sql<string | null>`min(${schema.resourceCertifications.expiresOn})`,
        })
        .from(schema.resources)
        .leftJoin(
          schema.resourceCertifications,
          eq(schema.resourceCertifications.resourceId, schema.resources.id),
        )
        .where(
          and(eq(schema.resources.vendorId, ctx.vendorId), eq(schema.resources.isActive, true)),
        )
        .groupBy(
          schema.resources.id,
          schema.resources.name,
          schema.resources.identifier,
          schema.resources.kind,
        )
        .orderBy(asc(schema.resources.name));

      return rows.map((row) => ({
        id: row.id,
        label: row.identifier === null ? row.name : `${row.name} · ${row.identifier}`,
        kind: row.kind,
        dueOn: row.dueOn,
        blocked: row.dueOn !== null && row.dueOn < today,
      }));
    }),
});
