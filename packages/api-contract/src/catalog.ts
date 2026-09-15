import { z } from 'zod';

import {
  categoryIdSchema,
  localeSchema,
  moneySchema,
  optionGroupIdSchema,
  optionIdSchema,
  serviceIdSchema,
  tierIdSchema,
  variantIdSchema,
  vendorIdSchema,
} from './common.ts';

/**
 * The catalogue, and the part of it worth getting exactly right: comparable
 * attributes are data, not columns (CLAUDE.md). One `attribute_definitions`
 * table drives three surfaces — the admin taxonomy manager edits it, the
 * vendor service builder renders it as a form, the traveler comparison engine
 * reads it. A hardcoded column on `services` can do none of those.
 */

export const categorySlugSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, 'A category slug is lowercase, digits and hyphens.');

/**
 * The twelve categories Dahab actually sells. Colour and icon are token names,
 * never literal values — the token package is the only place a colour exists.
 */
export const CATEGORY_SLUGS = [
  'scuba-diving',
  'freediving',
  'snorkeling',
  'desert-safari',
  'kitesurfing',
  'wellness-yoga',
  'bedouin-culture',
  'boat-trips',
  'courses-certifications',
  'gear-rental',
  'transfers',
  'photography',
] as const;

export const categorySchema = z
  .object({
    id: categoryIdSchema,
    parentId: categoryIdSchema.nullable(),
    slug: categorySlugSchema,
    /** i18n key, never a literal title. */
    nameKey: z.string().min(1),
    /** A token name from @dahab/tokens, e.g. "lagoon-500". Never a hex value. */
    colorToken: z.string().min(1),
    icon: z.string().min(1),
    sortOrder: z.number().int(),
  })
  .strict();
export type Category = z.infer<typeof categorySchema>;

/**
 * What an attribute holds. `enum` and `multiEnum` read their choices from
 * `options`; `measure` carries a unit and is the type the comparison engine
 * can put on a shared axis.
 */
export const attributeDataTypeSchema = z.enum([
  'text',
  'longText',
  'number',
  'measure',
  'boolean',
  'enum',
  'multiEnum',
  'duration',
  'date',
]);
export type AttributeDataType = z.infer<typeof attributeDataTypeSchema>;

/**
 * How two values of the same attribute are made comparable when vendors
 * express them differently — 40 minutes against 1 hour, 18 m against 60 ft.
 */
export const normalizationRuleSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }).strict(),
  z.object({ kind: z.literal('toMinutes') }).strict(),
  z.object({ kind: z.literal('toMetres') }).strict(),
  z.object({ kind: z.literal('toCelsius') }).strict(),
  z
    .object({
      kind: z.literal('scale'),
      /** Multiply the raw value to reach the canonical unit. */
      factor: z.number(),
    })
    .strict(),
]);

export const attributeOptionSchema = z
  .object({
    value: z.string().min(1),
    labelKey: z.string().min(1),
    sortOrder: z.number().int().default(0),
  })
  .strict();

export const attributeDefinitionSchema = z
  .object({
    id: z.string().uuid(),
    categoryId: categoryIdSchema,
    /** Stable machine key: `max_depth_m`, `includes_equipment`. */
    key: z.string().regex(/^[a-z][a-z0-9_]*$/),
    labelKey: z.string().min(1),
    dataType: attributeDataTypeSchema,
    /** Canonical unit for `measure`: "m", "min", "C". */
    unit: z.string().nullable(),
    isRequired: z.boolean(),
    /** Only comparable attributes reach the traveler comparison table. */
    isComparable: z.boolean(),
    /** Rows sharing a group are shown together: "Inclusions", "Depth". */
    comparisonGroup: z.string().nullable(),
    comparisonOrder: z.number().int(),
    normalizationRule: normalizationRuleSchema,
    /** Choices for enum/multiEnum. Empty for every other data type. */
    options: z.array(attributeOptionSchema).default([]),
  })
  .strict();
export type AttributeDefinition = z.infer<typeof attributeDefinitionSchema>;

/** One vendor's answer for one attribute. Exactly one value column is set. */
export const serviceAttributeValueSchema = z
  .object({
    serviceId: serviceIdSchema,
    attributeDefinitionId: z.string().uuid(),
    valueText: z.string().nullable(),
    valueNumber: z.number().nullable(),
    valueBool: z.boolean().nullable(),
    valueJson: z.unknown().nullable(),
  })
  .strict()
  .refine(
    (value) =>
      [value.valueText, value.valueNumber, value.valueBool, value.valueJson].filter(
        (candidate) => candidate !== null,
      ).length === 1,
    { message: 'Exactly one of valueText, valueNumber, valueBool, valueJson must be set.' },
  );

export const serviceStatusSchema = z.enum([
  'draft',
  'underReview',
  'published',
  'paused',
  'archived',
  'rejected',
]);
export type ServiceStatus = z.infer<typeof serviceStatusSchema>;

export const serviceTranslationSchema = z
  .object({
    serviceId: serviceIdSchema,
    locale: localeSchema,
    title: z.string().min(1).max(120),
    description: z.string().min(1),
    /** A translation can lag the source; the traveler sees the fallback. */
    status: z.enum(['machine', 'human', 'needsReview']),
  })
  .strict();

export const serviceSchema = z
  .object({
    id: serviceIdSchema,
    vendorId: vendorIdSchema,
    categoryId: categoryIdSchema,
    status: serviceStatusSchema,
    /** Minutes. A two-tank morning is 240; a Ras Abu Galum overnight is 1440. */
    durationMinutes: z.number().int().min(1),
    maxParticipants: z.number().int().min(1),
    minParticipants: z.number().int().min(1).default(1),
    /** Hours before the start after which the slot stops accepting bookings. */
    bookingCutoffHours: z.number().int().min(0).default(12),
  })
  .strict();
export type Service = z.infer<typeof serviceSchema>;

// --- The options tree -----------------------------------------------------

/**
 * service_variants -> service_tiers -> option_groups -> options.
 *
 * Modelled as a real tree with a parent reference and a depth constraint,
 * not nested JSON: a JSON blob cannot be joined, cannot be indexed, cannot be
 * validated by the database, and cannot be edited by two people at once.
 */
export const MAX_OPTION_TREE_DEPTH = 4;

export type VisibilityRule =
  | { kind: 'always' }
  | { kind: 'optionSelected'; optionId: string }
  | { kind: 'partyAtLeast'; minPartySize: number }
  | { kind: 'all'; rules: VisibilityRule[] };

/**
 * Recursive, so the type is declared first and the schema annotated against
 * it — z.lazy cannot infer its own shape.
 */
export const visibilityRuleSchema: z.ZodType<VisibilityRule> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('always') }).strict(),
    z
      .object({
        kind: z.literal('optionSelected'),
        optionId: optionIdSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal('partyAtLeast'),
        minPartySize: z.number().int().min(1),
      })
      .strict(),
    z
      .object({
        kind: z.literal('all'),
        rules: z.array(visibilityRuleSchema).min(1),
      })
      .strict(),
  ]),
);

export const serviceVariantSchema = z
  .object({
    id: variantIdSchema,
    serviceId: serviceIdSchema,
    nameKey: z.string().min(1),
    sortOrder: z.number().int().default(0),
  })
  .strict();

export const serviceTierSchema = z
  .object({
    id: tierIdSchema,
    variantId: variantIdSchema,
    nameKey: z.string().min(1),
    priceDelta: moneySchema,
    sortOrder: z.number().int().default(0),
  })
  .strict();

export const optionGroupSchema = z
  .object({
    id: optionGroupIdSchema,
    tierId: tierIdSchema,
    nameKey: z.string().min(1),
    minSelect: z.number().int().min(0),
    maxSelect: z.number().int().min(1),
    isRequired: z.boolean(),
    visibilityRule: visibilityRuleSchema,
    sortOrder: z.number().int().default(0),
  })
  .strict()
  .refine((group) => group.minSelect <= group.maxSelect, {
    message: 'minSelect cannot exceed maxSelect.',
  })
  .refine((group) => !group.isRequired || group.minSelect >= 1, {
    message: 'A required option group must ask for at least one selection.',
  });

export const optionSchema = z
  .object({
    id: optionIdSchema,
    groupId: optionGroupIdSchema,
    nameKey: z.string().min(1),
    priceDelta: moneySchema,
    perPerson: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
    isAvailable: z.boolean().default(true),
  })
  .strict();

/** Does a group show, given what is already selected and the party size? */
export function isGroupVisible(
  rule: VisibilityRule,
  context: { selectedOptionIds: readonly string[]; partySize: number },
): boolean {
  switch (rule.kind) {
    case 'always':
      return true;
    case 'optionSelected':
      return context.selectedOptionIds.includes(rule.optionId);
    case 'partyAtLeast':
      return context.partySize >= rule.minPartySize;
    case 'all':
      return rule.rules.every((nested) => isGroupVisible(nested, context));
  }
}
