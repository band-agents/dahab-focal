#!/usr/bin/env node
/**
 * drizzle-kit quotes any column type it does not recognise as native. Its
 * allow-list includes `geometry` but not `geography`, so a generated
 * migration contains:
 *
 *     "location" "geography(Point, 4326)"
 *
 * which Postgres rejects — a quoted identifier is a type *name*, and no type
 * is called `geography(Point, 4326)`.
 *
 * `geometry` would pass unquoted, but then ST_DWithin measures in degrees on
 * a projected plane rather than metres on a spheroid, and "experiences within
 * 3 km of my stay" has to be true on the ground.
 *
 * So the type stays `geography` and this script unquotes it after every
 * generate. It is wired into `pnpm db:generate`, and a test asserts no quoted
 * form survives in `migrations/`, so it cannot be silently skipped.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsDir = fileURLToPath(new URL('../migrations', import.meta.url));

/** Matches `"geography(Point, 4326)"` and the polygon form. */
export const QUOTED_GEOGRAPHY = /"(geography\([^"]*\))"/g;

const changed = [];

for (const file of readdirSync(migrationsDir)) {
  if (!file.endsWith('.sql')) continue;
  const path = join(migrationsDir, file);
  const before = readFileSync(path, 'utf8');
  const after = before.replace(QUOTED_GEOGRAPHY, '$1');
  if (after !== before) {
    writeFileSync(path, after, 'utf8');
    changed.push(file);
  }
}

if (changed.length === 0) {
  console.log('postgis-unquote: nothing to change.');
} else {
  console.log(`postgis-unquote: unquoted geography types in ${changed.join(', ')}.`);
}
