import { TRPCError } from '@trpc/server';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';

import {
  PricingError,
  adjustmentSchema,
  computePrice,
  currencySchema,
  moneySchema,
  priceBreakdownSchema,
  pricingModelKindSchema,
  ruleConditionSchema,
  totalHeadcount,
  type Party,
  type PricingRuleInput,
} from '@dahab/api-contract';
import { schema } from '@dahab/db';
import { LOCALES, SOURCE_LOCALE } from '@dahab/i18n';

import { requirePermission } from '../trpc.ts';
import { asCurrency, cairoDay, requireDb } from './_shared.ts';

/**
 * Pricing, as the console reads it.
 *
 * Every price on the platform is decided by these three tables, and until
 * this router nothing in the console could open them. It reads; it does not
 * compute. The console hands what comes back to `computePrice()` from
 * `@dahab/api-contract` — the one implementation the checkout and the operator
 * app also call — so a preview here is the price a traveller would be quoted,
 * not a second opinion about it.
 *
 * Gated on `pricing.readAny`, never on `pricing.manage`: the second is what a
 * vendor owner holds over their own rate card, and this answers for everyone's.
 */

const serviceStatusSchema = z.enum([
  'draft',
  'underReview',
  'published',
  'paused',
  'archived',
  'rejected',
]);

const localeInput = z.object({ locale: z.enum(LOCALES).optional() });

/**
 * Null where the service has no title in this locale or in English. The slug
 * is never the fallback: a raw slug on screen is a bug this console has
 * already shipped once.
 */
const titleSchema = z.string().nullable();

const listRowSchema = z.object({
  serviceId: z.string().uuid(),
  title: titleSchema,
  vendorId: z.string().uuid(),
  vendorName: z.string(),
  /** An i18n key. The slug is never rendered — see `titleSchema`. */
  categoryNameKey: z.string(),
  status: serviceStatusSchema,
  /** The newest model, or null where the service has none — it cannot be quoted. */
  model: z
    .object({
      kind: pricingModelKindSchema,
      basePrice: moneySchema,
      maxGroupSize: z.number().int().nullable(),
      tiers: z.number().int(),
    })
    .nullable(),
  /**
   * How many models the service carries. The contract prices a service by
   * exactly one; more than one is a data problem the screen has to show
   * rather than quietly picking a winner.
   */
  models: z.number().int(),
  rules: z.object({ total: z.number().int(), active: z.number().int() }),
});

const ruleRowSchema = z.object({
  id: z.string().uuid(),
  labelKey: z.string(),
  conditionKind: z.string(),
  adjustmentKind: z.string(),
  /**
   * Parsed against the contract. Null where the stored jsonb does not match
   * its kind: such a rule is one `computePrice()` would reject, so it is shown
   * as broken rather than dropped — a rule that silently vanishes from the
   * screen still exists in the table.
   */
  condition: ruleConditionSchema.nullable(),
  adjustment: adjustmentSchema.nullable(),
  priority: z.number().int(),
  stackable: z.boolean(),
  exclusionGroup: z.string().nullable(),
  activeFrom: z.string().nullable(),
  activeUntil: z.string().nullable(),
  isActive: z.boolean(),
});

/** Heads by kind for a price check. Capped: this is a question, not a booking. */
const quotePartySchema = z.object({
  adult: z.number().int().min(0).max(99).default(0),
  child: z.number().int().min(0).max(99).default(0),
  infant: z.number().int().min(0).max(99).default(0),
  student: z.number().int().min(0).max(99).default(0),
  resident: z.number().int().min(0).max(99).default(0),
  instructor: z.number().int().min(0).max(99).default(0),
});

const QUOTE_REFUSALS = [
  /** No model: there is nothing to price with. */
  'noModel',
  'emptyParty',
  /**
   * A rental must say whether it is priced per person, per item or per group,
   * and `pricing_models` has no column to hold that. computePrice rightly
   * refuses to guess, so no rental can be quoted until the schema has one.
   */
  'needsUnitBasis',
  'groupTooLarge',
  /** computePrice refused for a reason of its own; the log has it. */
  'refused',
] as const;

const quoteSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    party: quotePartySchema,
    tripDate: z.string(),
    breakdown: priceBreakdownSchema,
  }),
  z.object({
    ok: z.literal(false),
    party: quotePartySchema,
    tripDate: z.string(),
    reason: z.enum(QUOTE_REFUSALS),
  }),
]);

const detailSchema = z.object({
  service: z.object({
    id: z.string().uuid(),
    title: titleSchema,
    vendorId: z.string().uuid(),
    vendorName: z.string(),
    categoryNameKey: z.string(),
    status: serviceStatusSchema,
    minParticipants: z.number().int(),
    maxParticipants: z.number().int().nullable(),
  }),
  /** Newest first. Normally one. */
  models: z.array(
    z.object({
      id: z.string().uuid(),
      kind: pricingModelKindSchema,
      currency: currencySchema,
      basePrice: moneySchema,
      maxGroupSize: z.number().int().nullable(),
      tiers: z.array(
        z.object({
          id: z.string().uuid(),
          minPartySize: z.number().int(),
          unitPrice: moneySchema,
        }),
      ),
    }),
  ),
  /** In the order computePrice applies them: priority, then id. */
  rules: z.array(ruleRowSchema),
  /** What the party asked about would be charged, worked out by computePrice(). */
  quote: quoteSchema,
});

const DAY_MS = 86_400_000;

/**
 * A rule's window, compared against the database clock. Written as `now()`
 * rather than a bound Date on purpose — a Date inside a raw `sql` template
 * reaches the driver as an object and fails the request (twice, on this
 * branch).
 */
const ACTIVE_NOW = sql`r.is_active
  AND (r.active_from IS NULL OR r.active_from <= now())
  AND (r.active_until IS NULL OR r.active_until >= now())`;

export const adminPricingRouter = {
  /**
   * Every service and how it is priced — one round trip.
   *
   * The model, the counts and the title all come back as columns of one
   * query rather than a query per service, because at ~75 ms to Ireland a
   * rate card for forty services would otherwise take three seconds.
   */
  pricing: requirePermission('pricing.readAny')
    .input(localeInput)
    .output(z.array(listRowSchema))
    .query(async ({ ctx, input }) => {
      const db = requireDb(ctx);
      const locale = input.locale ?? ctx.locale;
      const wanted = alias(schema.serviceTranslations, 'wanted_title');
      const fallback = alias(schema.serviceTranslations, 'fallback_title');
      const model = schema.pricingModels;

      const rows = await db
        .select({
          serviceId: schema.services.id,
          status: schema.services.status,
          vendorId: schema.vendors.id,
          vendorName: schema.vendors.displayName,
          categoryNameKey: schema.categories.nameKey,
          title: sql<string | null>`coalesce(${wanted.title}, ${fallback.title})`,
          modelKind: model.kind,
          basePriceAmount: model.basePriceAmount,
          basePriceCurrency: model.basePriceCurrency,
          maxGroupSize: model.maxGroupSize,
          tiers: sql<number>`(
            SELECT count(*)::int FROM pricing_tiers t WHERE t.pricing_model_id = ${model.id}
          )`,
          models: sql<number>`(
            SELECT count(*)::int FROM pricing_models m WHERE m.service_id = ${schema.services.id}
          )`,
          rulesTotal: sql<number>`(
            SELECT count(*)::int FROM pricing_rules r WHERE r.service_id = ${schema.services.id}
          )`,
          rulesActive: sql<number>`(
            SELECT count(*)::int FROM pricing_rules r
            WHERE r.service_id = ${schema.services.id} AND ${ACTIVE_NOW}
          )`,
        })
        .from(schema.services)
        .innerJoin(schema.vendors, eq(schema.vendors.id, schema.services.vendorId))
        .innerJoin(schema.categories, eq(schema.categories.id, schema.services.categoryId))
        .leftJoin(wanted, and(eq(wanted.serviceId, schema.services.id), eq(wanted.locale, locale)))
        .leftJoin(
          fallback,
          and(eq(fallback.serviceId, schema.services.id), eq(fallback.locale, SOURCE_LOCALE)),
        )
        // The newest model only, chosen in SQL so a service with two models
        // is still one row. `models` above says when that happened.
        .leftJoin(
          model,
          sql`${model.id} = (
            SELECT m.id FROM pricing_models m
            WHERE m.service_id = ${schema.services.id}
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT 1
          )`,
        )
        .orderBy(asc(schema.vendors.displayName), asc(schema.services.slug));

      return rows.map((row) => ({
        serviceId: row.serviceId,
        title: row.title,
        vendorId: row.vendorId,
        vendorName: row.vendorName,
        categoryNameKey: row.categoryNameKey,
        status: row.status,
        model:
          row.modelKind === null || row.basePriceAmount === null
            ? null
            : {
                kind: row.modelKind,
                basePrice: {
                  amount: Number(row.basePriceAmount),
                  currency: asCurrency(row.basePriceCurrency),
                },
                maxGroupSize: row.maxGroupSize,
                tiers: Number(row.tiers),
              },
        models: Number(row.models),
        rules: { total: Number(row.rulesTotal), active: Number(row.rulesActive) },
      }));
    }),

  /**
   * One service's rate card, whole: the model, its tiers, every rule.
   *
   * Three queries, and they are independent, so they run together — one
   * round trip of wall time rather than three.
   */
  servicePricing: requirePermission('pricing.readAny')
    .input(
      localeInput.extend({
        serviceId: z.string().uuid(),
        /** Defaults to two adults — the commonest party on a Dahab boat. */
        party: quotePartySchema.optional(),
        /** A Cairo calendar day. Defaults to tomorrow. */
        tripDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .refine((day) => !Number.isNaN(Date.parse(`${day}T10:00:00Z`)), 'Not a calendar day.')
          .optional(),
      }),
    )
    .output(detailSchema)
    .query(async ({ ctx, input }) => {
      const db = requireDb(ctx);
      const locale = input.locale ?? ctx.locale;
      const wanted = alias(schema.serviceTranslations, 'wanted_title');
      const fallback = alias(schema.serviceTranslations, 'fallback_title');

      const [services, modelRows, ruleRows] = await Promise.all([
        db
          .select({
            id: schema.services.id,
            status: schema.services.status,
            minParticipants: schema.services.minParticipants,
            maxParticipants: schema.services.maxParticipants,
            vendorId: schema.vendors.id,
            vendorName: schema.vendors.displayName,
            categoryNameKey: schema.categories.nameKey,
            title: sql<string | null>`coalesce(${wanted.title}, ${fallback.title})`,
          })
          .from(schema.services)
          .innerJoin(schema.vendors, eq(schema.vendors.id, schema.services.vendorId))
          .innerJoin(schema.categories, eq(schema.categories.id, schema.services.categoryId))
          .leftJoin(wanted, and(eq(wanted.serviceId, schema.services.id), eq(wanted.locale, locale)))
          .leftJoin(
            fallback,
            and(eq(fallback.serviceId, schema.services.id), eq(fallback.locale, SOURCE_LOCALE)),
          )
          .where(eq(schema.services.id, input.serviceId))
          .limit(1),
        db
          .select({
            id: schema.pricingModels.id,
            kind: schema.pricingModels.kind,
            currency: schema.pricingModels.currency,
            basePriceAmount: schema.pricingModels.basePriceAmount,
            basePriceCurrency: schema.pricingModels.basePriceCurrency,
            maxGroupSize: schema.pricingModels.maxGroupSize,
            tierId: schema.pricingTiers.id,
            minPartySize: schema.pricingTiers.minPartySize,
            unitPriceAmount: schema.pricingTiers.unitPriceAmount,
            unitPriceCurrency: schema.pricingTiers.unitPriceCurrency,
          })
          .from(schema.pricingModels)
          .leftJoin(
            schema.pricingTiers,
            eq(schema.pricingTiers.pricingModelId, schema.pricingModels.id),
          )
          .where(eq(schema.pricingModels.serviceId, input.serviceId))
          .orderBy(
            desc(schema.pricingModels.createdAt),
            desc(schema.pricingModels.id),
            asc(schema.pricingTiers.minPartySize),
          ),
        db
          .select()
          .from(schema.pricingRules)
          .where(eq(schema.pricingRules.serviceId, input.serviceId))
          .orderBy(asc(schema.pricingRules.priority), asc(schema.pricingRules.id)),
      ]);

      const service = services[0];
      if (service === undefined) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No such service.' });
      }

      // One row per tier, folded back into one entry per model.
      const models = new Map<string, z.infer<typeof detailSchema>['models'][number]>();
      for (const row of modelRows) {
        let entry = models.get(row.id);
        if (entry === undefined) {
          entry = {
            id: row.id,
            kind: row.kind,
            currency: asCurrency(row.currency),
            basePrice: {
              amount: Number(row.basePriceAmount),
              currency: asCurrency(row.basePriceCurrency),
            },
            maxGroupSize: row.maxGroupSize,
            tiers: [],
          };
          models.set(row.id, entry);
        }
        if (row.tierId !== null && row.minPartySize !== null && row.unitPriceAmount !== null) {
          entry.tiers.push({
            id: row.tierId,
            minPartySize: row.minPartySize,
            unitPrice: {
              amount: Number(row.unitPriceAmount),
              currency: asCurrency(row.unitPriceCurrency),
            },
          });
        }
      }

      const rules = ruleRows.map((row) => {
        // The kind is a column and the body is jsonb; the contract's schemas
        // are discriminated on `kind`, so the column is folded back in.
        const condition = ruleConditionSchema.safeParse({ ...row.condition, kind: row.conditionKind });
        const adjustment = adjustmentSchema.safeParse({ ...row.adjustment, kind: row.adjustmentKind });
        if (!condition.success || !adjustment.success) {
          ctx.logger.warn('pricing rule does not match the contract', {
            ruleId: row.id,
            condition: condition.success,
            adjustment: adjustment.success,
          });
        }
        return {
          id: row.id,
          labelKey: row.labelKey,
          conditionKind: row.conditionKind,
          adjustmentKind: row.adjustmentKind,
          condition: condition.success ? condition.data : null,
          adjustment: adjustment.success ? adjustment.data : null,
          priority: row.priority,
          stackable: row.stackable,
          exclusionGroup: row.exclusionGroup,
          activeFrom: row.activeFrom?.toISOString() ?? null,
          activeUntil: row.activeUntil?.toISOString() ?? null,
          isActive: row.isActive,
        };
      });

      const party: Party = input.party ?? { ...quotePartySchema.parse({}), adult: 2 };
      const tripDate = input.tripDate ?? cairoDay(new Date(ctx.now.getTime() + DAY_MS));
      const newest = [...models.values()][0];

      const quote = ((): z.infer<typeof quoteSchema> => {
        const refuse = (reason: (typeof QUOTE_REFUSALS)[number]) =>
          ({ ok: false as const, party, tripDate, reason });

        if (newest === undefined) return refuse('noModel');
        if (totalHeadcount(party) === 0) return refuse('emptyParty');
        if (newest.kind === 'perUnitPerDay') return refuse('needsUnitBasis');
        // Read as a limit rather than priced: computePrice throws the same
        // refusal, and this lets the screen say which one it was.
        if (
          newest.kind === 'perGroup' &&
          newest.maxGroupSize !== null &&
          totalHeadcount(party) > newest.maxGroupSize
        ) {
          return refuse('groupTooLarge');
        }

        // A rule switched off, or one whose jsonb does not parse, is not part
        // of the price. The screen shows both; neither is charged.
        const usable: PricingRuleInput[] = rules.flatMap((rule) =>
          rule.condition === null || rule.adjustment === null || !rule.isActive
            ? []
            : [
                {
                  id: rule.id,
                  labelKey: rule.labelKey,
                  condition: rule.condition,
                  adjustment: rule.adjustment,
                  priority: rule.priority,
                  stackable: rule.stackable,
                  ...(rule.exclusionGroup === null ? {} : { exclusionGroup: rule.exclusionGroup }),
                  ...(rule.activeFrom === null ? {} : { activeFrom: new Date(rule.activeFrom) }),
                  ...(rule.activeUntil === null ? {} : { activeUntil: new Date(rule.activeUntil) }),
                },
              ],
        );

        try {
          const breakdown = computePrice({
            serviceId: service.id,
            model: {
              kind: newest.kind,
              currency: newest.currency,
              basePrice: newest.basePrice,
              tiers: newest.tiers.map((tier) => ({
                minPartySize: tier.minPartySize,
                unitPrice: tier.unitPrice,
              })),
              ...(newest.maxGroupSize === null ? {} : { maxGroupSize: newest.maxGroupSize }),
            },
            party,
            // Midday in Cairo on the chosen day, whatever the DST offset:
            // 10:00 UTC is 12:00 or 13:00 there, never another calendar day.
            activityAt: new Date(`${tripDate}T10:00:00Z`),
            bookedAt: ctx.now,
            rules: usable,
            quoteCurrency: newest.currency,
          });
          return { ok: true, party, tripDate, breakdown };
        } catch (error) {
          if (!(error instanceof PricingError) && !(error instanceof z.ZodError)) throw error;
          ctx.logger.warn('price check refused', { serviceId: service.id, reason: error.message });
          return refuse('refused');
        }
      })();

      return {
        quote,
        service: {
          id: service.id,
          title: service.title,
          vendorId: service.vendorId,
          vendorName: service.vendorName,
          categoryNameKey: service.categoryNameKey,
          status: service.status,
          minParticipants: service.minParticipants,
          maxParticipants: service.maxParticipants,
        },
        models: [...models.values()],
        rules,
      };
    }),
};
