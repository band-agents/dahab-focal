import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { services } from './catalog';
import { currencyEnum, moneyAmount, moneyCurrency, primaryId, timestamps } from './_shared';

/**
 * PRICING.
 *
 * These tables are storage for the vocabulary in @dahab/api-contract; the
 * arithmetic lives in computePrice() and nowhere else. Nothing in this file
 * decides a price — a query here produces the inputs, and one function
 * turns them into a number (CLAUDE.md).
 */

export const pricingModelKindEnum = pgEnum('pricing_model_kind', [
  'perPerson',
  'perGroup',
  'perPersonTiered',
  'perUnitPerDay',
  'free',
]);

export const pricingModels = pgTable(
  'pricing_models',
  {
    id: primaryId(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    kind: pricingModelKindEnum('kind').notNull(),
    currency: currencyEnum('currency').notNull().default('EGP'),
    basePriceAmount: moneyAmount('base_price_amount').notNull(),
    basePriceCurrency: moneyCurrency('base_price_currency').notNull(),
    /** Only meaningful for perGroup. */
    maxGroupSize: integer('max_group_size'),
    ...timestamps,
  },
  (table) => [
    index('pricing_models_service_idx').on(table.serviceId),
    check('pricing_models_base_price_non_negative', sql`${table.basePriceAmount} >= 0`),
  ],
);

/** Per-person price that drops once the party reaches `minPartySize`. */
export const pricingTiers = pgTable(
  'pricing_tiers',
  {
    id: primaryId(),
    pricingModelId: uuid('pricing_model_id')
      .notNull()
      .references(() => pricingModels.id, { onDelete: 'cascade' }),
    minPartySize: integer('min_party_size').notNull(),
    unitPriceAmount: moneyAmount('unit_price_amount').notNull(),
    unitPriceCurrency: moneyCurrency('unit_price_currency').notNull(),
    ...timestamps,
  },
  (table) => [
    index('pricing_tiers_model_idx').on(table.pricingModelId, table.minPartySize),
    check('pricing_tiers_min_party', sql`${table.minPartySize} >= 1`),
  ],
);

export const ruleConditionKindEnum = pgEnum('rule_condition_kind', [
  'seasonal',
  'dayOfWeek',
  'earlyBird',
  'lastMinute',
  'participantKind',
  'groupSize',
  'currency',
  'always',
]);

export const adjustmentKindEnum = pgEnum('adjustment_kind', ['percentage', 'fixed', 'override']);

/**
 * Typed, priority-ordered, stackable. `condition` and `adjustment` are jsonb
 * because their shape varies by kind, but the *kind* is a column so the
 * admin can index and filter on it, and so a malformed rule is visible in a
 * plain SELECT rather than only at parse time.
 */
export const pricingRules = pgTable(
  'pricing_rules',
  {
    id: primaryId(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    labelKey: varchar('label_key', { length: 120 }).notNull(),
    conditionKind: ruleConditionKindEnum('condition_kind').notNull(),
    condition: jsonb('condition').$type<Record<string, unknown>>().notNull(),
    adjustmentKind: adjustmentKindEnum('adjustment_kind').notNull(),
    adjustment: jsonb('adjustment').$type<Record<string, unknown>>().notNull(),
    /** Lower applies first. Percentages compound in this order. */
    priority: integer('priority').notNull().default(100),
    stackable: boolean('stackable').notNull().default(true),
    /** Rules sharing a group compete when one of them is non-stackable. */
    exclusionGroup: varchar('exclusion_group', { length: 60 }),
    activeFrom: timestamp('active_from', { withTimezone: true, mode: 'date' }),
    activeUntil: timestamp('active_until', { withTimezone: true, mode: 'date' }),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index('pricing_rules_service_idx').on(table.serviceId, table.priority),
    index('pricing_rules_active_idx').on(table.serviceId, table.isActive),
    check(
      'pricing_rules_active_window',
      sql`${table.activeFrom} IS NULL OR ${table.activeUntil} IS NULL OR ${table.activeFrom} <= ${table.activeUntil}`,
    ),
  ],
);

/**
 * Published FX rates. Prices are quoted in EGP with a EUR equivalent, and the
 * rate used is stored on the booking so a receipt can be re-rendered years
 * later with the number the traveler actually saw.
 */
export const exchangeRates = pgTable(
  'exchange_rates',
  {
    id: primaryId(),
    baseCurrency: currencyEnum('base_currency').notNull(),
    quoteCurrency: currencyEnum('quote_currency').notNull(),
    /** Rate scaled by 1e6 and held as an integer — no float in the money path. */
    rateMicros: integer('rate_micros').notNull(),
    effectiveOn: date('effective_on').notNull(),
    source: varchar('source', { length: 60 }).notNull(),
    ...timestamps,
  },
  (table) => [
    index('exchange_rates_lookup_idx').on(
      table.baseCurrency,
      table.quoteCurrency,
      table.effectiveOn,
    ),
    check('exchange_rates_positive', sql`${table.rateMicros} > 0`),
  ],
);

export const pricingModelsRelations = relations(pricingModels, ({ many, one }) => ({
  service: one(services, { fields: [pricingModels.serviceId], references: [services.id] }),
  tiers: many(pricingTiers),
}));

export const pricingRulesRelations = relations(pricingRules, ({ one }) => ({
  service: one(services, { fields: [pricingRules.serviceId], references: [services.id] }),
}));
