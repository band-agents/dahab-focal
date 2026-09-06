import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

import { vendors } from './vendors';
import {
  attributeDataTypeEnum,
  deletedAt,
  localeEnum,
  primaryId,
  serviceStatusEnum,
  timestamps,
} from './_shared';

/**
 * CATALOG.
 *
 * The load-bearing idea: comparable attributes are data, not columns.
 * `attribute_definitions` is edited by the admin taxonomy manager, rendered
 * as a form by the vendor service builder, and read by the traveler
 * comparison engine. One table, three surfaces. A hardcoded column on
 * `services` can serve none of them, and the comparison feature could never
 * ship on top of one (CLAUDE.md).
 */

export const categories = pgTable(
  'categories',
  {
    id: primaryId(),
    // Self-reference needs the explicit AnyPgColumn annotation; without it
    // TypeScript cannot close the loop on the table type.
    parentId: uuid('parent_id').references((): AnyPgColumn => categories.id),
    slug: varchar('slug', { length: 60 }).notNull(),
    /** i18n key. A category name is never stored as a literal. */
    nameKey: varchar('name_key', { length: 120 }).notNull(),
    /** A token name from @dahab/tokens — "lagoon-500", never a hex value. */
    colorToken: varchar('color_token', { length: 60 }).notNull(),
    icon: varchar('icon', { length: 60 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('categories_slug_key').on(table.slug),
    index('categories_parent_idx').on(table.parentId),
    // Token names, never literals. A '#' here would be a hardcoded colour
    // living outside tokens.json, which the whole design system forbids.
    check('categories_color_is_token', sql`${table.colorToken} !~ '^#'`),
  ],
);

/**
 * One row per comparable fact a category cares about.
 *
 * `normalizationRule` is what lets two vendors who answered "40 minutes" and
 * "1 hour" end up on the same comparison axis, and `comparisonGroup` is what
 * puts depth next to depth rather than next to lunch.
 */
export const attributeDefinitions = pgTable(
  'attribute_definitions',
  {
    id: primaryId(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    /** Machine key: `max_depth_m`, `includes_equipment`, `guide_ratio`. */
    key: varchar('key', { length: 80 }).notNull(),
    labelKey: varchar('label_key', { length: 120 }).notNull(),
    dataType: attributeDataTypeEnum('data_type').notNull(),
    /** Canonical unit for `measure` values: "m", "min", "C", "bar". */
    unit: varchar('unit', { length: 20 }),
    isRequired: boolean('is_required').notNull().default(false),
    /** Only comparable attributes reach the traveler comparison table. */
    isComparable: boolean('is_comparable').notNull().default(false),
    /** "Inclusions", "Depth and difficulty", "Group and guiding". */
    comparisonGroup: varchar('comparison_group', { length: 80 }),
    comparisonOrder: integer('comparison_order').notNull().default(0),
    normalizationRule: jsonb('normalization_rule')
      .$type<{ kind: string; factor?: number }>()
      .notNull()
      .default({ kind: 'none' }),
    /** Choices for enum / multiEnum. Empty for every other data type. */
    optionsJson: jsonb('options_json')
      .$type<{ value: string; labelKey: string; sortOrder: number }[]>()
      .notNull()
      .default([]),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('attribute_definitions_category_key').on(table.categoryId, table.key),
    index('attribute_definitions_comparable_idx').on(table.categoryId, table.isComparable),
  ],
);

export const services = pgTable(
  'services',
  {
    id: primaryId(),
    vendorId: uuid('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    status: serviceStatusEnum('status').notNull().default('draft'),
    slug: varchar('slug', { length: 120 }).notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    minParticipants: integer('min_participants').notNull().default(1),
    maxParticipants: integer('max_participants').notNull(),
    /** Hours before the start after which a slot stops taking bookings. */
    bookingCutoffHours: integer('booking_cutoff_hours').notNull().default(12),
    /**
     * A single dive means 18 hours before a flight; multi-day means 24. Held
     * per service because a snorkel trip means neither.
     */
    noFlyHours: integer('no_fly_hours').notNull().default(0),
    heroImageUrl: text('hero_image_url'),
    ...timestamps,
    deletedAt: deletedAt(),
  },
  (table) => [
    uniqueIndex('services_vendor_slug_key').on(table.vendorId, table.slug),
    index('services_category_status_idx').on(table.categoryId, table.status),
    index('services_vendor_idx').on(table.vendorId),
    check('services_party_range', sql`${table.minParticipants} <= ${table.maxParticipants}`),
    check('services_duration_positive', sql`${table.durationMinutes} > 0`),
  ],
);

export const serviceTranslations = pgTable(
  'service_translations',
  {
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    description: text('description').notNull(),
    /**
     * A machine translation is honest about being one, so the UI can offer
     * "show original" and the admin queue can find what needs a human.
     */
    status: varchar('status', { length: 20 }).notNull().default('human'),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.serviceId, table.locale] }),
    index('service_translations_locale_idx').on(table.locale),
  ],
);

/**
 * The vendor's answer for one attribute. Exactly one value column is set,
 * enforced by a check constraint rather than by convention — an EAV table
 * without that constraint rots within a quarter.
 */
export const serviceAttributeValues = pgTable(
  'service_attribute_values',
  {
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    attributeDefinitionId: uuid('attribute_definition_id')
      .notNull()
      .references(() => attributeDefinitions.id, { onDelete: 'cascade' }),
    valueText: text('value_text'),
    valueNumber: doublePrecision('value_number'),
    valueBool: boolean('value_bool'),
    valueJson: jsonb('value_json'),
    /**
     * `valueNumber` converted to the attribute's canonical unit by its
     * normalization rule. Written once, so the comparison engine can sort and
     * range-filter without re-deriving anything per request.
     */
    normalizedNumber: doublePrecision('normalized_number'),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.serviceId, table.attributeDefinitionId] }),
    index('service_attribute_values_definition_idx').on(table.attributeDefinitionId),
    // Comparison range queries hit this: "max depth between 18 and 30 m".
    index('service_attribute_values_normalized_idx').on(
      table.attributeDefinitionId,
      table.normalizedNumber,
    ),
    check(
      'service_attribute_values_exactly_one',
      sql`(
        (${table.valueText} IS NOT NULL)::int +
        (${table.valueNumber} IS NOT NULL)::int +
        (${table.valueBool} IS NOT NULL)::int +
        (${table.valueJson} IS NOT NULL)::int
      ) = 1`,
    ),
  ],
);

export const categoriesRelations = relations(categories, ({ many, one }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'categoryParent',
  }),
  children: many(categories, { relationName: 'categoryParent' }),
  attributeDefinitions: many(attributeDefinitions),
  services: many(services),
}));

export const servicesRelations = relations(services, ({ many, one }) => ({
  vendor: one(vendors, { fields: [services.vendorId], references: [vendors.id] }),
  category: one(categories, { fields: [services.categoryId], references: [categories.id] }),
  translations: many(serviceTranslations),
  attributeValues: many(serviceAttributeValues),
}));
