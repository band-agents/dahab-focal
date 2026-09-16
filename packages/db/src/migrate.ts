import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';

import { createDatabase } from './client.ts';

/**
 * Runs every migration, then asserts the two things a silent failure would
 * otherwise hide: that PostGIS is actually installed, and that the spatial
 * indexes exist. A schema that migrated but has no GIST index still answers
 * "within 3 km" — with a sequential scan over every row.
 */
async function main(): Promise<void> {
  const { db, close } = createDatabase({ singleConnection: true });

  try {
    console.log('Running migrations…');
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)),
    });

    const [postgis] = await db.execute<{ version: string }>(
      sql`SELECT postgis_lib_version() AS version`,
    );
    console.log(`PostGIS ${postgis?.version ?? 'unknown'} present.`);

    const gist = await db.execute<{ indexname: string; tablename: string }>(sql`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public' AND indexdef ILIKE '%USING gist%'
      ORDER BY tablename, indexname
    `);
    console.log(`GIST indexes (${gist.length}):`);
    for (const row of gist) {
      console.log(`  ${row.tablename}.${row.indexname}`);
    }
    if (gist.length === 0) {
      throw new Error('No GIST index was created — spatial queries would fall back to seq scans.');
    }

    const [tables] = await db.execute<{ count: number }>(sql`
      SELECT count(*)::int AS count
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    console.log(`${tables?.count ?? 0} tables in public.`);
  } finally {
    await close();
  }
}

await main();
