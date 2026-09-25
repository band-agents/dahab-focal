import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { GROUPS, MODULES, moduleTally } from '../lib/modules';
import { SECTIONS, TAB_KEYS } from '../lib/nav';

/**
 * The module map is a claim about the business, so it is checked like one.
 *
 * Two things here are not style rules. The tab bar's five slots are a physical
 * constraint — a sixth is where thumb reach stops being reliable on a 375px
 * phone — and `nav.ts` has claimed in a comment since it was written that a
 * sixth would fail a test. It did not, until now.
 *
 * And every table a module claims has to exist in `packages/db`. That is what
 * keeps `lib/modules.ts` a map of this platform rather than a generic admin
 * menu: a module with a table nobody can find is one somebody imagined.
 */

const SCHEMA_DIR = join(import.meta.dirname, '..', '..', '..', 'packages', 'db', 'src', 'schema');

/** Every table name the schema actually declares. */
const declaredTables = new Set(
  readdirSync(SCHEMA_DIR)
    .filter((file) => file.endsWith('.ts'))
    .flatMap((file) => {
      const source = readFileSync(join(SCHEMA_DIR, file), 'utf8');
      return [...source.matchAll(/pgTable\(\s*\n?\s*'([a-z_]+)'/g)].map((match) => match[1]);
    })
    .filter((name): name is string => name !== undefined),
);

describe('the tab bar stays reachable by a thumb', () => {
  it('carries exactly five tabs', () => {
    expect(TAB_KEYS).toHaveLength(5);
  });

  it('opens on Home, so the whole product is one tap from anywhere', () => {
    expect(TAB_KEYS[0]).toBe('home');
  });

  it('gives every tab a section that exists', () => {
    for (const key of TAB_KEYS) {
      expect(SECTIONS.some((section) => section.key === key), `no section "${key}"`).toBe(true);
    }
  });
});

describe('the module map is grounded in the schema', () => {
  it('names a table that exists for every table it claims', () => {
    const unknown: string[] = [];
    for (const module of MODULES) {
      for (const table of module.evidence) {
        if (!declaredTables.has(table)) unknown.push(`${module.key} → ${table}`);
      }
    }
    expect(unknown, `tables no schema file declares:\n${unknown.join('\n')}`).toEqual([]);
  });

  it('gives every module a group the grid renders', () => {
    for (const module of MODULES) {
      expect(GROUPS).toContain(module.group);
    }
  });

  it('never links a module that has not been built', () => {
    for (const module of MODULES) {
      if (module.state === 'planned') {
        expect(module.path, `${module.key} is planned but carries a path`).toBeUndefined();
      }
    }
  });

  /**
   * A planned module may still carry a live figure — `health` measures itself
   * through the API's own probe. What it may not do is pretend there is a
   * screen to open.
   */
  it('lets a planned module report a real figure without offering a screen', () => {
    const health = MODULES.find((module) => module.key === 'health');
    expect(health?.state).toBe('planned');
    expect(health?.signal).toBe('health');
    expect(health?.path).toBeUndefined();
  });

  it('gives every module that is not planned somewhere to go', () => {
    for (const module of MODULES) {
      if (module.state !== 'planned') {
        expect(module.path, `${module.key} is ${module.state} with no path`).toBeDefined();
      }
    }
  });

  it('has no duplicate keys', () => {
    const keys = MODULES.map((module) => module.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  /**
   * Not a target, a record. The console covers a minority of its own schema,
   * and that number moving is a change somebody should have to look at — in
   * either direction.
   */
  it('reports the coverage it actually has', () => {
    const tally = moduleTally();
    expect(tally.live + tally.partial + tally.planned).toBe(MODULES.length);
    expect(tally.live).toBe(10);
    expect(tally.partial).toBe(6);
    expect(tally.planned).toBe(13);
  });

  it('covers a real share of the tables the platform has', () => {
    const claimed = new Set(MODULES.flatMap((module) => module.evidence));
    // Not every table belongs to a module — join tables and OTP challenges do
    // not need a screen — but the map should reach most of them.
    expect(claimed.size).toBeGreaterThanOrEqual(40);
    expect(declaredTables.size).toBeGreaterThanOrEqual(50);
  });
});
