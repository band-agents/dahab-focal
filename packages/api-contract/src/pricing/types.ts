import { z } from 'zod';

import {
  currencySchema,
  dateOnlySchema,
  isoWeekdaySchema,
  moneySchema,
  optionIdSchema,
  pricingRuleIdSchema,
  serviceIdSchema,
} from '../common';

/**
 * The pricing vocabulary.
 *
 * Every shape a Dahab operator actually quotes in has to be expressible here,
 * because `computePrice` is the only implementation and there is nowhere else
 * to put a special case.
 */

/**
 * How the base price scales.
 *
 * - `perPerson`     a fun dive, a yoga class: price x party size
 * - `perGroup`      a private boat, a chartered jeep: one price, any size
 * - `perPersonTiered` a course where price drops with group size
 * - `perUnitPerDay` a rental: price x units x days. What a "unit" is — a head, a
 *                   bike, the whole party — is `unitBasis`, stated, never inferred.
 * - `free`          a shore briefing, a meetup
 */
export const pricingModelKindSchema = z.enum([
  'perPerson',
  'perGroup',
  'perPersonTiered',
  'perUnitPerDay',
  'free',
]);
export type PricingModelKind = z.infer<typeof pricingModelKindSchema>;

/**
 * What one rental unit is billed against. Bikes, scooters, kites and cameras
 * are `perItem` — a party of two sharing one scooter is one scooter, not two.
 * A guided kit-and-guide day might be `perPerson`; a chartered set-up for the
 * whole group is `perGroup`. Rentals are a designed category, so this is a
 * real distinction, not a hypothetical one — and it is set explicitly on the
 * model rather than guessed from the category.
 */
export const rentalUnitBasisSchema = z.enum(['perPerson', 'perItem', 'perGroup']);
export type RentalUnitBasis = z.infer<typeof rentalUnitBasisSchema>;

/** A per-person price that drops once the party reaches `minPartySize`. */
export const partySizeTierSchema = z
  .object({
    minPartySize: z.number().int().min(1),
    unitPrice: moneySchema,
  })
  .strict();

export const pricingModelSchema = z
  .object({
    kind: pricingModelKindSchema,
    currency: currencySchema,
    /** The headline price. Its meaning depends on `kind` and, for a rental, `unitBasis`. */
    basePrice: moneySchema,
    /** Only for `perPersonTiered`, sorted or not — computePrice sorts it. */
    tiers: z.array(partySizeTierSchema).default([]),
    /** Only for `perGroup`: a party larger than this is not bookable as one group. */
    maxGroupSize: z.number().int().min(1).optional(),
    /**
     * Required for `perUnitPerDay`, and only meaningful there. No default — an
     * unset basis on a rental is a rejected input, not a silent `perPerson`.
     */
    unitBasis: rentalUnitBasisSchema.optional(),
  })
  .strict()
  .superRefine((model, ctx) => {
    if (model.kind === 'perUnitPerDay' && model.unitBasis === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['unitBasis'],
        message:
          "A perUnitPerDay model must state its unitBasis ('perPerson', 'perItem' or 'perGroup'). It is never inferred.",
      });
    }
    if (model.kind !== 'perUnitPerDay' && model.unitBasis !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['unitBasis'],
        message: 'unitBasis only applies to a perUnitPerDay model.',
      });
    }
  });
export type PricingModel = z.infer<typeof pricingModelSchema>;

/**
 * Participant categories. They exist because Egyptian operators really do
 * price them differently — a resident rate and a student rate are not
 * marketing, they are the law of the land and the dive-centre noticeboard.
 */
export const participantKindSchema = z.enum([
  'adult',
  'child',
  'infant',
  'student',
  'resident',
  'instructor',
]);
export type ParticipantKind = z.infer<typeof participantKindSchema>;

/**
 * Two independent facts about a participant kind, never the same flag.
 *
 * - `isChargeable`     — does this seat contribute to the price?
 * - `occupiesCapacity` — does this seat take a place on the boat, and appear on
 *                        the manifest the coastguard would ask for?
 *
 * An infant rides free and an accompanying instructor is the operator's own
 * staff, so neither is charged — but both still take a seat and still have to
 * be accounted for if the boat needs evacuating. A future "waitlist" or
 * "no-show" kind could be chargeable without occupying capacity; the two must
 * be able to move independently.
 */
export interface ParticipantRule {
  readonly isChargeable: boolean;
  readonly occupiesCapacity: boolean;
}

export const PARTICIPANT_RULES: Readonly<Record<ParticipantKind, ParticipantRule>> = {
  adult: { isChargeable: true, occupiesCapacity: true },
  child: { isChargeable: true, occupiesCapacity: true },
  student: { isChargeable: true, occupiesCapacity: true },
  resident: { isChargeable: true, occupiesCapacity: true },
  infant: { isChargeable: false, occupiesCapacity: true },
  instructor: { isChargeable: false, occupiesCapacity: true },
};

export const partySchema = z
  .object({
    adult: z.number().int().min(0).default(0),
    child: z.number().int().min(0).default(0),
    infant: z.number().int().min(0).default(0),
    student: z.number().int().min(0).default(0),
    resident: z.number().int().min(0).default(0),
    instructor: z.number().int().min(0).default(0),
  })
  .strict();
export type Party = z.infer<typeof partySchema>;

/** How a rule changes the running total. */
export const adjustmentSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('percentage'),
      /** -0.15 is 15% off; 0.10 is a 10% surcharge. */
      rate: z.number().min(-1).max(10),
    })
    .strict(),
  z
    .object({
      kind: z.literal('fixed'),
      /** Signed. Negative reduces the total. */
      delta: moneySchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('override'),
      /** Replaces the running total outright — a fixed off-season rate. */
      price: moneySchema,
    })
    .strict(),
]);
export type Adjustment = z.infer<typeof adjustmentSchema>;

/** What has to be true for a rule to fire. */
export const ruleConditionSchema = z.discriminatedUnion('kind', [
  /** Season: the activity date falls inside an inclusive Cairo date range. */
  z
    .object({
      kind: z.literal('seasonal'),
      startDate: dateOnlySchema,
      endDate: dateOnlySchema,
    })
    .strict(),
  /** Day of week, evaluated in Cairo. Friday and Saturday are the weekend. */
  z
    .object({
      kind: z.literal('dayOfWeek'),
      weekdays: z.array(isoWeekdaySchema).min(1),
    })
    .strict(),
  /** Booked at least N whole days before the activity. */
  z
    .object({
      kind: z.literal('earlyBird'),
      minDaysAhead: z.number().int().min(1),
    })
    .strict(),
  /** Booked within N hours of the activity. */
  z
    .object({
      kind: z.literal('lastMinute'),
      withinHours: z.number().int().min(1),
    })
    .strict(),
  /** Applies to the seats held by particular participant kinds. */
  z
    .object({
      kind: z.literal('participantKind'),
      participants: z.array(participantKindSchema).min(1),
    })
    .strict(),
  /** Party at or above a size. */
  z
    .object({
      kind: z.literal('groupSize'),
      minPartySize: z.number().int().min(1),
    })
    .strict(),
  /** Quotes in a specific currency instead of converting. */
  z
    .object({
      kind: z.literal('currency'),
      currency: currencySchema,
    })
    .strict(),
  /** Always fires. For a flat platform fee or a blanket seasonal override. */
  z.object({ kind: z.literal('always') }).strict(),
]);
export type RuleCondition = z.infer<typeof ruleConditionSchema>;

export const pricingRuleSchema = z
  .object({
    id: pricingRuleIdSchema,
    /** Shown to the traveler and the vendor in the breakdown. An i18n key. */
    labelKey: z.string().min(1),
    condition: ruleConditionSchema,
    adjustment: adjustmentSchema,
    /**
     * Lower numbers apply first. Percentages compound in priority order, so
     * this is the difference between 10% off then 15% off and the reverse —
     * which is a different number, and has to be the vendor's choice.
     */
    priority: z.number().int().default(100),
    /**
     * When false, this rule is the last one to apply from its
     * `exclusionGroup`. Two competing seasonal rates should not stack.
     */
    stackable: z.boolean().default(true),
    /** Rules sharing a group compete; only relevant when `stackable` is false. */
    exclusionGroup: z.string().optional(),
    /** Outside this window the rule does not exist yet, or no longer does. */
    activeFrom: z.coerce.date().optional(),
    activeUntil: z.coerce.date().optional(),
  })
  .strict();
export type PricingRule = z.infer<typeof pricingRuleSchema>;
/** The shape a caller supplies: plain string ids, defaults still optional. */
export type PricingRuleInput = z.input<typeof pricingRuleSchema>;

/** A chosen add-on: a nitrox fill, a private guide, a lunch. */
export const selectedOptionSchema = z
  .object({
    optionId: optionIdSchema,
    labelKey: z.string().min(1),
    unitPrice: moneySchema,
    quantity: z.number().int().min(1),
    /** Per-person options multiply by party size; per-booking ones do not. */
    perPerson: z.boolean().default(false),
  })
  .strict();
export type SelectedOption = z.infer<typeof selectedOptionSchema>;

export const priceInputSchema = z
  .object({
    serviceId: serviceIdSchema,
    model: pricingModelSchema,
    party: partySchema,
    /** The instant the activity starts, UTC. Day-of-week is read in Cairo. */
    activityAt: z.coerce.date(),
    /** The instant the booking is being made, UTC. Passed in, never Date.now(). */
    bookedAt: z.coerce.date(),
    /** Rental days, or course days. 1 for a single session. */
    units: z.number().int().min(1).default(1),
    /**
     * How many items are being rented — bikes, scooters, kites, cameras. Only
     * consulted by a `perUnitPerDay` model whose `unitBasis` is `perItem`; one
     * party can rent three bikes, or one scooter between them.
     */
    itemCount: z.number().int().min(1).default(1),
    options: z.array(selectedOptionSchema).default([]),
    rules: z.array(pricingRuleSchema).default([]),
    /** The currency the traveler is being quoted in. */
    quoteCurrency: currencySchema,
  })
  .strict();
export type PriceInput = z.input<typeof priceInputSchema>;
export type ParsedPriceInput = z.infer<typeof priceInputSchema>;

/** One line of the explanation shown to both sides of the transaction. */
export const priceLineSchema = z
  .object({
    kind: z.enum(['base', 'option', 'rule']),
    labelKey: z.string(),
    /** Signed contribution to the total. */
    amount: moneySchema,
    /** Populated for rule lines, so the UI can link back to the rule. */
    ruleId: pricingRuleIdSchema.optional(),
    /** Populated for percentage rules: what the rate was. */
    rate: z.number().optional(),
    /** Free-form detail for the breakdown, e.g. "3 x adult". */
    detail: z.string().optional(),
  })
  .strict();
export type PriceLine = z.infer<typeof priceLineSchema>;

export const priceBreakdownSchema = z
  .object({
    subtotal: moneySchema,
    total: moneySchema,
    lines: z.array(priceLineSchema),
    /** Rules that matched but were suppressed by an exclusion group. */
    suppressedRuleIds: z.array(pricingRuleIdSchema),
    /** Chargeable heads. Infants and accompanying instructors are not in this number. */
    chargeableParty: z.number().int(),
    /**
     * Heads that occupy a seat and belong on the manifest — every participant
     * except a kind explicitly marked `occupiesCapacity: false`. Infants and
     * instructors ARE in this number even though they are not in
     * `chargeableParty`.
     */
    capacityParty: z.number().int(),
  })
  .strict();
export type PriceBreakdown = z.infer<typeof priceBreakdownSchema>;
