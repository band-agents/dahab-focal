import { eq, sql } from 'drizzle-orm';

import { createDatabase, type Database } from '../client.ts';
import {
  attributeDefinitions,
  categories,
  diveSites,
  neighborhoods,
  users,
  vendorDocuments,
  vendors,
} from '../schema/index.ts';
import { CATEGORY_ATTRIBUTES } from './attributes.ts';
import {
  CATEGORIES,
  DIVE_SITES,
  NEIGHBORHOODS,
  VENDORS,
  VENDOR_DOCUMENTS,
  documentExpiresOn,
} from './dahab.ts';
import { seedOperations } from './write-operations.ts';

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
        status: vendor.status,
        ownerUserId: owner.id,
        neighborhood: vendor.neighborhood,
        location: { latitude: vendor.latitude, longitude: vendor.longitude },
        verificationStatus: vendor.verificationStatus,
      })
      .onConflictDoUpdate({
        target: vendors.slug,
        set: {
          legalName: vendor.legalName,
          displayName: vendor.displayName,
          status: vendor.status,
          neighborhood: vendor.neighborhood,
          location: { latitude: vendor.latitude, longitude: vendor.longitude },
          verificationStatus: vendor.verificationStatus,
          updatedAt: new Date(),
        },
      });
  }
  return VENDORS.length;
}

/**
 * The documents, and the dates they run out on.
 *
 * There is no natural key on `vendor_documents` — an operator can hold two
 * boat licences — so this replaces the seeded set per vendor rather than
 * upserting row by row. Re-seeding therefore refreshes the expiry dates,
 * which is the point: the board should always have something in every band.
 */
async function seedVendorDocuments(db: Database): Promise<number> {
  const rows = await db
    .select({ id: vendors.id, slug: vendors.slug })
    .from(vendors);
  const idBySlug = new Map(rows.map((row) => [row.slug, row.id]));

  let count = 0;
  for (const vendorSlug of new Set(VENDOR_DOCUMENTS.map((doc) => doc.vendorSlug))) {
    const vendorId = idBySlug.get(vendorSlug);
    if (vendorId === undefined) continue;
    await db.delete(vendorDocuments).where(eq(vendorDocuments.vendorId, vendorId));
  }

  for (const document of VENDOR_DOCUMENTS) {
    const vendorId = idBySlug.get(document.vendorSlug);
    if (vendorId === undefined) continue;

    await db.insert(vendorDocuments).values({
      vendorId,
      type: document.type,
      // No document store yet: the row is the record of the paperwork, and
      // the file it points at does not exist until uploads are built.
      fileUrl: `seed://not-uploaded/${document.vendorSlug}/${document.type}`,
      documentNumber: document.documentNumber,
      issuer: document.issuer,
      expiresOn: documentExpiresOn(document),
      blocksPublishing: document.blocksPublishing,
      verificationStatus: document.verificationStatus,
      rejectionReason: document.rejectionReason ?? null,
    });
    count += 1;
  }
  return count;
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
    const documentCount = await seedVendorDocuments(db);
    const operations = await seedOperations(db);

    console.log('Register:');
    console.log(`  ${neighborhoodCount} neighborhoods`);
    console.log(`  ${diveSiteCount} dive sites`);
    console.log(`  ${taxonomy.categories} categories`);
    console.log(`  ${taxonomy.attributes} attribute definitions`);
    console.log(`  ${vendorCount} vendors`);
    console.log(`  ${documentCount} vendor documents`);
    console.log(`  ${operations.staff} staff`);
    console.log(`  ${operations.resources} resources`);
    console.log(`  ${operations.featureFlags} feature flags`);

    console.log('\nOperating week:');
    console.log(`  ${operations.services} services`);
    console.log(`  ${operations.serviceTranslations} service translations`);
    console.log(`  ${operations.attributeValues} attribute values`);
    console.log(`  ${operations.pricingModels} pricing models, ${operations.pricingRules} pricing rules`);
    console.log(`  ${operations.slots} departures`);
    console.log(`  ${operations.bookings} bookings`);
    console.log(`  ${operations.participants} participants`);
    console.log(`  ${operations.payments} payments`);
    console.log(`  ${operations.refunds} refunds`);
    console.log(`  ${operations.payouts} payouts`);
    console.log(`  ${operations.ledgerEntries} ledger entries (balanced)`);
    console.log(`  ${operations.reviews} reviews`);
    console.log(`  ${operations.incidents} incidents`);
    console.log(`  ${operations.disputes} disputes`);

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
