import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { services } from './catalog';
import { vendors } from './vendors';
import {
  geographyPoint,
  geographyPolygon,
  moneyAmount,
  moneyCurrency,
  primaryId,
  timestamps,
} from './_shared';

/**
 * GEOGRAPHY, in PostGIS.
 *
 * "Experiences within 3 km of my stay" is a spatial query with a GIST index
 * behind it, not a client-side filter over a page of results. Every column
 * here is `geography` on SRID 4326, so ST_DWithin answers in metres on a
 * spheroid.
 */

export const diveSiteDifficultyEnum = pgEnum('dive_site_difficulty', [
  'beginner',
  'intermediate',
  'advanced',
  'technical',
]);

export const diveSiteEntryEnum = pgEnum('dive_site_entry', ['shore', 'boat', 'both']);

/**
 * The dive sites of Dahab. Depth and difficulty are not decoration: the Arch
 * at the Blue Hole crosses at about 56 m and is technical-only, and the
 * booking flow refuses a traveler whose certification does not reach it.
 */
export const diveSites = pgTable(
  'dive_sites',
  {
    id: primaryId(),
    slug: varchar('slug', { length: 80 }).notNull(),
    nameKey: varchar('name_key', { length: 120 }).notNull(),
    location: geographyPoint('location').notNull(),
    /** Where a shore entry actually starts, when it differs from the site. */
    entryPoint: geographyPoint('entry_point'),
    minDepthMetres: integer('min_depth_metres'),
    maxDepthMetres: integer('max_depth_metres'),
    difficulty: diveSiteDifficultyEnum('difficulty').notNull(),
    entryType: diveSiteEntryEnum('entry_type').notNull(),
    /** Certification level required, if any. Null means open to all. */
    requiresCertification: varchar('requires_certification', { length: 80 }),
    marineLife: jsonb('marine_life').$type<string[]>().notNull().default([]),
    hazards: jsonb('hazards').$type<string[]>().notNull().default([]),
    /** Month-by-month notes: water temperature, thermoclines, current. */
    seasonalNotes: jsonb('seasonal_notes').$type<Record<string, string>>(),
    descriptionKey: varchar('description_key', { length: 120 }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('dive_sites_slug_key').on(table.slug),
    index('dive_sites_location_gix').using('gist', table.location),
    // The shore entry is queried the same way the site is: 'which entries are
    // within walking distance of where I am standing?'
    index('dive_sites_entry_point_gix').using('gist', table.entryPoint),
    index('dive_sites_difficulty_idx').on(table.difficulty),
    check(
      'dive_sites_depth_range',
      sql`${table.minDepthMetres} IS NULL OR ${table.maxDepthMetres} IS NULL OR ${table.minDepthMetres} <= ${table.maxDepthMetres}`,
    ),
  ],
);

/** Which sites a service visits, and in what order. */
export const serviceDiveSites = pgTable(
  'service_dive_sites',
  {
    id: primaryId(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    diveSiteId: uuid('dive_site_id')
      .notNull()
      .references(() => diveSites.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    isOptional: boolean('is_optional').notNull().default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('service_dive_sites_unique').on(table.serviceId, table.diveSiteId),
    index('service_dive_sites_site_idx').on(table.diveSiteId),
  ],
);

export const neighborhoods = pgTable(
  'neighborhoods',
  {
    id: primaryId(),
    slug: varchar('slug', { length: 60 }).notNull(),
    nameKey: varchar('name_key', { length: 120 }).notNull(),
    centre: geographyPoint('centre').notNull(),
    boundary: geographyPolygon('boundary'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('neighborhoods_slug_key').on(table.slug),
    index('neighborhoods_centre_gix').using('gist', table.centre),
    index('neighborhoods_boundary_gix').using('gist', table.boundary),
  ],
);

/** Where a group actually gathers: a dive centre door, a car park, a jetty. */
export const meetingPoints = pgTable(
  'meeting_points',
  {
    id: primaryId(),
    vendorId: uuid('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'cascade' }),
    nameKey: varchar('name_key', { length: 120 }).notNull(),
    location: geographyPoint('location').notNull(),
    addressLine: text('address_line'),
    instructions: text('instructions'),
    ...timestamps,
  },
  (table) => [
    index('meeting_points_vendor_idx').on(table.vendorId),
    index('meeting_points_location_gix').using('gist', table.location),
  ],
);

/**
 * Pickup zones as polygons with a surcharge. A hotel in Assalah is included;
 * one out past the Lighthouse costs extra; anything beyond the zones is not
 * offered rather than quietly quoted wrong.
 */
export const pickupZones = pgTable(
  'pickup_zones',
  {
    id: primaryId(),
    vendorId: uuid('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'cascade' }),
    nameKey: varchar('name_key', { length: 120 }).notNull(),
    area: geographyPolygon('area').notNull(),
    surchargeAmount: moneyAmount('surcharge_amount').notNull().default(0),
    surchargeCurrency: moneyCurrency('surcharge_currency').notNull().default('EGP'),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index('pickup_zones_vendor_idx').on(table.vendorId),
    index('pickup_zones_area_gix').using('gist', table.area),
    check('pickup_zones_surcharge_non_negative', sql`${table.surchargeAmount} >= 0`),
  ],
);

export const diveSitesRelations = relations(diveSites, ({ many }) => ({
  services: many(serviceDiveSites),
}));

export const serviceDiveSitesRelations = relations(serviceDiveSites, ({ one }) => ({
  service: one(services, { fields: [serviceDiveSites.serviceId], references: [services.id] }),
  diveSite: one(diveSites, { fields: [serviceDiveSites.diveSiteId], references: [diveSites.id] }),
}));
