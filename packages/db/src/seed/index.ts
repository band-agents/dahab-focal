import { sql } from 'drizzle-orm';

import { createDatabase, type Database } from '../client';
import {
  attributeDefinitions,
  categories,
  diveSites,
  neighborhoods,
  users,
  vendors,
} from '../schema/index';
import { CATEGORY_ATTRIBUTES } from './attributes';
import { CATEGORIES, DIVE_SITES, NEIGHBORHOODS, VENDORS } from './dahab';

/**
 * `pnpm db:seed`.
 *
 * Idempotent: every insert is an upsert on the natural key, so running it
 * twice against a live database is safe and running it after a schema change
 * refreshes rather than duplicates.
 *
 * Vendors need an owner, so a placeholder owner user is created per vendor
 * with no contact details — it is a row to hang a foreign key on, not a
 * person, and it is obvious in the data which it is.
 */

async function seedNeighborhoods(db: Database): Promise<number> {
  for (const item of NEIGHBORHOODS) {
    await db
      .insert(neighborhoods)
      .values({
        slug: item.slug,
        nameKey: item.nameKey,
        centre: { latitude: item.latitude, longitude: item.longitude },
      })
      .onConflictDoUpdate({
        target: neighborhoods.slug,
        set: {
          nameKey: item.nameKey,
          centre: { latitude: item.latitude, longitude: item.longitude },
          updatedAt: new Date(),
        },
      });
  }
  return NEIGHBORHOODS.length;
}

async function seedDiveSites(db: Database): Promise<number> {
  for (const site of DIVE_SITES) {
    await db
      .insert(diveSites)
      .values({
        slug: site.slug,
        nameKey: site.nameKey,
        location: { latitude: site.latitude, longitude: site.longitude },
        minDepthMetres: site.minDepthMetres,
        maxDepthMetres: site.maxDepthMetres,
        difficulty: site.difficulty,
        entryType: site.entryType,
        requiresCertification: site.requiresCertification,
        marineLife: [...site.marineLife],
        hazards: [...site.hazards],
        seasonalNotes: site.seasonalNotes,
      })
      .onConflictDoUpdate({
        target: diveSites.slug,
        set: {
          location: { latitude: site.latitude, longitude: site.longitude },
          minDepthMetres: site.minDepthMetres,
          maxDepthMetres: site.maxDepthMetres,
          difficulty: site.difficulty,
          entryType: site.entryType,
          requiresCertification: site.requiresCertification,
          marineLife: [...site.marineLife],
          hazards: [...site.hazards],
          seasonalNotes: site.seasonalNotes,
          updatedAt: new Date(),
        },
      });
  }
  return DIVE_SITES.length;
}

async function seedCategoriesAndAttributes(db: Database): Promise<{
  categories: number;
  attributes: number;
}> {
  let attributeCount = 0;

  for (const category of CATEGORIES) {
    const [row] = await db
      .insert(categories)
      .values({
        parentId: null,
        slug: category.slug,
        nameKey: category.nameKey,
        colorToken: category.colorToken,
        icon: category.icon,
        sortOrder: category.sortOrder,
      })
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          nameKey: category.nameKey,
          colorToken: category.colorToken,
          icon: category.icon,
          sortOrder: category.sortOrder,
          updatedAt: new Date(),
        },
      })
      .returning({ id: categories.id });

    if (row === undefined) continue;

    for (const attribute of CATEGORY_ATTRIBUTES[category.slug] ?? []) {
      await db
        .insert(attributeDefinitions)
        .values({
          categoryId: row.id,
          key: attribute.key,
          labelKey: attribute.labelKey,
          dataType: attribute.dataType,
          unit: attribute.unit,
          isRequired: attribute.isRequired,
          isComparable: attribute.isComparable,
          comparisonGroup: attribute.comparisonGroup,
          comparisonOrder: attribute.comparisonOrder,
          normalizationRule: attribute.normalizationRule,
          optionsJson: attribute.options.map((option) => ({ ...option })),
        })
        .onConflictDoUpdate({
          target: [attributeDefinitions.categoryId, attributeDefinitions.key],
          set: {
            labelKey: attribute.labelKey,
            dataType: attribute.dataType,
            unit: attribute.unit,
            isRequired: attribute.isRequired,
            isComparable: attribute.isComparable,
            comparisonGroup: attribute.comparisonGroup,
            comparisonOrder: attribute.comparisonOrder,
            normalizationRule: attribute.normalizationRule,
            optionsJson: attribute.options.map((option) => ({ ...option })),
            updatedAt: new Date(),
          },
        });
      attributeCount += 1;
    }
  }

  return { categories: CATEGORIES.length, attributes: attributeCount };
}

async function seedVendors(db: Database): Promise<number> {
  for (const vendor of VENDORS) {
    // A placeholder owner, clearly marked. Real owners arrive by claiming
    // their account through the vendor app.
    const [owner] = await db
      .insert(users)
      .values({ email: `owner+${vendor.slug}@seed.dahabfocal.invalid`, isGuest: false })
      .onConflictDoUpdate({
        target: users.email,
        set: { updatedAt: new Date() },
      })
      .returning({ id: users.id });

    if (owner === undefined) continue;

    await db
      .insert(vendors)
      .values({
        slug: vendor.slug,
        legalName: vendor.legalName,
        displayName: vendor.displayName,
        status: 'active',
        ownerUserId: owner.id,
        neighborhood: vendor.neighborhood,
        location: { latitude: vendor.latitude, longitude: vendor.longitude },
        verificationStatus: 'verified',
      })
      .onConflictDoUpdate({
        target: vendors.slug,
        set: {
          legalName: vendor.legalName,
          displayName: vendor.displayName,
          neighborhood: vendor.neighborhood,
          location: { latitude: vendor.latitude, longitude: vendor.longitude },
          updatedAt: new Date(),
        },
      });
  }
  return VENDORS.length;
}

async function main(): Promise<void> {
  const { db, close } = createDatabase({ singleConnection: true });

  try {
    const [extension] = await db.execute<{ installed: boolean }>(
      sql`SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS installed`,
    );
    if (extension?.installed !== true) {
      throw new Error('PostGIS is not installed. Run `pnpm db:migrate` first.');
    }

    const neighborhoodCount = await seedNeighborhoods(db);
    const diveSiteCount = await seedDiveSites(db);
    const taxonomy = await seedCategoriesAndAttributes(db);
    const vendorCount = await seedVendors(db);

    console.log('Seeded:');
    console.log(`  ${neighborhoodCount} neighborhoods`);
    console.log(`  ${diveSiteCount} dive sites`);
    console.log(`  ${taxonomy.categories} categories`);
    console.log(`  ${taxonomy.attributes} attribute definitions`);
    console.log(`  ${vendorCount} vendors`);

    // Prove the spatial index is usable, not just present: everything within
    // 3 km of the Masbat bridge.
    const nearby = await db.execute<{ slug: string; metres: number }>(sql`
      SELECT slug, ST_Distance(location, ST_MakePoint(34.5183, 28.5122)::geography)::int AS metres
      FROM dive_sites
      WHERE ST_DWithin(location, ST_MakePoint(34.5183, 28.5122)::geography, 3000)
      ORDER BY metres
    `);
    console.log(`\nDive sites within 3 km of Masbat (${nearby.length}):`);
    for (const row of nearby) {
      console.log(`  ${row.slug} — ${row.metres} m`);
    }
  } finally {
    await close();
  }
}

await main();
