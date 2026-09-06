import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * These assertions run without a database. They cannot prove the migration
 * applies, but they can prove the things that would make it fail on contact
 * with Postgres, and the things a future `drizzle-kit generate` could quietly
 * undo.
 *
 * Applying the migrations for real is `pnpm db:migrate` against the compose
 * stack; docs/FOUNDATION.md records that this session could not run it.
 */

const migrationsDir = fileURLToPath(new URL('../migrations', import.meta.url));

function migrationFiles(): { name: string; sql: string }[] {
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(migrationsDir, name), 'utf8') }));
}

const files = migrationFiles();
const allSql = files.map((file) => file.sql).join('\n');

describe('migration ordering', () => {
  it('creates extensions before anything uses them', () => {
    const first = files[0];
    expect(first?.name).toBe('0000_extensions.sql');
    expect(first?.sql).toContain('CREATE EXTENSION IF NOT EXISTS postgis');
    expect(first?.sql).toContain('uuid_generate_v7');
  });

  it('has a journal entry for every migration file', () => {
    const journal = JSON.parse(
      readFileSync(join(migrationsDir, 'meta', '_journal.json'), 'utf8'),
    ) as { entries: { tag: string }[] };
    const tags = journal.entries.map((entry) => entry.tag).sort();
    const names = files.map((file) => file.name.replace(/\.sql$/, '')).sort();
    expect(tags).toEqual(names);
  });
});

describe('PostGIS', () => {
  it('declares geography columns unquoted, so Postgres can read the type', () => {
    // drizzle-kit quotes types it does not recognise, and `geography` is not
    // on its native list. scripts/postgis-unquote.mjs fixes that after every
    // generate; this is the assertion that it was not skipped.
    expect(allSql).not.toMatch(/"geography\(/);
    expect(allSql).toMatch(/geography\(Point, 4326\)/);
    expect(allSql).toMatch(/geography\(Polygon, 4326\)/);
  });

  it('creates a GIST index for every geography column', () => {
    const geographyColumns = [...allSql.matchAll(/"(\w+)"\s+geography\(/g)].map(
      (match) => match[1],
    );
    expect(geographyColumns.length).toBeGreaterThanOrEqual(7);

    const gistIndexes = [...allSql.matchAll(/USING gist \("(\w+)"\)/g)].map((match) => match[1]);
    for (const column of new Set(geographyColumns)) {
      expect(gistIndexes, `no GIST index covers ${String(column)}`).toContain(column);
    }
  });
});

describe('money is never a float and never the money type', () => {
  it('uses bigint amounts with a char(3) currency', () => {
    expect(allSql).not.toMatch(/\bmoney\b(?!_)/i);
    const amountColumns = [...allSql.matchAll(/"(\w*amount)"\s+(\w+)/g)];
    expect(amountColumns.length).toBeGreaterThan(5);
    for (const [, column, type] of amountColumns) {
      expect(type, `${String(column)} should be bigint`).toBe('bigint');
    }

    const currencyColumns = [...allSql.matchAll(/"(\w*currency)"\s+([a-z]+\(\d+\))/g)];
    for (const [, column, type] of currencyColumns) {
      expect(type, `${String(column)} should be char(3)`).toBe('char(3)');
    }
  });
});

describe('time is timestamptz throughout', () => {
  it('never declares a naive timestamp', () => {
    const naive = [...allSql.matchAll(/"(\w+)"\s+timestamp(?! with time zone)/g)].map(
      (match) => match[1],
    );
    expect(naive, `these columns lack a time zone: ${naive.join(', ')}`).toEqual([]);
  });
});

describe('the invariants that keep the data honest', () => {
  it('constrains the EAV table to exactly one value column', () => {
    expect(allSql).toContain('service_attribute_values_exactly_one');
  });

  it('cannot oversell a boat', () => {
    expect(allSql).toContain('availability_slots_not_oversold');
  });

  it('rejects a zero-amount ledger leg', () => {
    expect(allSql).toContain('ledger_entries_non_zero');
  });

  it('keeps category colours as token names, never hex values', () => {
    expect(allSql).toContain('categories_color_is_token');
  });

  it('holds the options tree at a fixed depth per level', () => {
    for (const constraint of [
      'service_variants_depth',
      'service_tiers_depth',
      'option_groups_depth',
      'options_depth',
    ]) {
      expect(allSql).toContain(constraint);
    }
  });

  it('makes every payment and refund idempotent', () => {
    expect(allSql).toContain('payments_idempotency_key');
    expect(allSql).toContain('refunds_idempotency_key');
  });
});

describe('no hardcoded colour ever reaches the schema', () => {
  it('contains no hex literal', () => {
    const hexes = allSql.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hexes).toEqual([]);
  });
});
