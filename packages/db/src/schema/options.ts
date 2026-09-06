import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { services } from './catalog';
import { moneyAmount, moneyCurrency, primaryId, timestamps } from './_shared';

/**
 * THE OPTIONS TREE — service_variants -> service_tiers -> option_groups ->
 * options.
 *
 * A real tree with a parent reference and a depth constraint, not nested
 * JSON. JSON cannot be joined, cannot be indexed, cannot be constrained by
 * the database, and cannot be edited by two people at once without one of
 * them losing their work.
 */

/** variant 1, tier 2, group 3, option 4. Enforced by a check constraint. */
export const MAX_OPTION_TREE_DEPTH = 4;

export const serviceVariants = pgTable(
  'service_variants',
  {
    id: primaryId(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    /** "Two-tank boat dive", "Shore dive", "Night dive". An i18n key. */
    nameKey: varchar('name_key', { length: 120 }).notNull(),
    depth: integer('depth').notNull().default(1),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index('service_variants_service_idx').on(table.serviceId),
    check('service_variants_depth', sql`${table.depth} = 1`),
  ],
);

export const serviceTiers = pgTable(
  'service_tiers',
  {
    id: primaryId(),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => serviceVariants.id, { onDelete: 'cascade' }),
    /** "Standard", "With guide", "Private". An i18n key. */
    nameKey: varchar('name_key', { length: 120 }).notNull(),
    priceDeltaAmount: moneyAmount('price_delta_amount').notNull().default(0),
    priceDeltaCurrency: moneyCurrency('price_delta_currency').notNull().default('EGP'),
    depth: integer('depth').notNull().default(2),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index('service_tiers_variant_idx').on(table.variantId),
    check('service_tiers_depth', sql`${table.depth} = 2`),
  ],
);

export const optionGroups = pgTable(
  'option_groups',
  {
    id: primaryId(),
    tierId: uuid('tier_id')
      .notNull()
      .references(() => serviceTiers.id, { onDelete: 'cascade' }),
    nameKey: varchar('name_key', { length: 120 }).notNull(),
    minSelect: integer('min_select').notNull().default(0),
    maxSelect: integer('max_select').notNull().default(1),
    isRequired: boolean('is_required').notNull().default(false),
    /**
     * Conditional display: "show the nitrox group only once the enriched-air
     * course option is selected". Evaluated by isGroupVisible() in
     * @dahab/api-contract so vendor preview and traveler checkout agree.
     */
    visibilityRule: jsonb('visibility_rule')
      .$type<{ kind: string; [key: string]: unknown }>()
      .notNull()
      .default({ kind: 'always' }),
    depth: integer('depth').notNull().default(3),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index('option_groups_tier_idx').on(table.tierId),
    check('option_groups_depth', sql`${table.depth} = 3`),
    check('option_groups_select_range', sql`${table.minSelect} <= ${table.maxSelect}`),
    // A required group that asks for zero selections is a contradiction the
    // vendor builder must not be able to save.
    check(
      'option_groups_required_implies_min',
      sql`NOT ${table.isRequired} OR ${table.minSelect} >= 1`,
    ),
  ],
);

export const options = pgTable(
  'options',
  {
    id: primaryId(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => optionGroups.id, { onDelete: 'cascade' }),
    nameKey: varchar('name_key', { length: 120 }).notNull(),
    priceDeltaAmount: moneyAmount('price_delta_amount').notNull().default(0),
    priceDeltaCurrency: moneyCurrency('price_delta_currency').notNull().default('EGP'),
    /** Per-person options multiply by the party; per-booking ones do not. */
    perPerson: boolean('per_person').notNull().default(false),
    depth: integer('depth').notNull().default(4),
    sortOrder: integer('sort_order').notNull().default(0),
    isAvailable: boolean('is_available').notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index('options_group_idx').on(table.groupId),
    check('options_depth', sql`${table.depth} = ${sql.raw(String(MAX_OPTION_TREE_DEPTH))}`),
  ],
);

export const serviceVariantsRelations = relations(serviceVariants, ({ many, one }) => ({
  service: one(services, { fields: [serviceVariants.serviceId], references: [services.id] }),
  tiers: many(serviceTiers),
}));

export const serviceTiersRelations = relations(serviceTiers, ({ many, one }) => ({
  variant: one(serviceVariants, {
    fields: [serviceTiers.variantId],
    references: [serviceVariants.id],
  }),
  optionGroups: many(optionGroups),
}));

export const optionGroupsRelations = relations(optionGroups, ({ many, one }) => ({
  tier: one(serviceTiers, { fields: [optionGroups.tierId], references: [serviceTiers.id] }),
  options: many(options),
}));

export const optionsRelations = relations(options, ({ one }) => ({
  group: one(optionGroups, { fields: [options.groupId], references: [optionGroups.id] }),
}));
