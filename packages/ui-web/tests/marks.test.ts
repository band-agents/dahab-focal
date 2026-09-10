import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CATEGORY_MARKS, ILLOS, MARKS } from '../src/marks/data';
import type { MarkGlyph } from '../src/marks/data';

/**
 * The marks are generated from the design board, so these tests guard the
 * things a regeneration could silently break: the inventory, the construction
 * rule, and the promise that every tint is a real token rather than a hex that
 * crept back in.
 */

const tokens = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../tokens/tokens.json', import.meta.url)),
    'utf8',
  ),
) as { color: Record<string, Record<string, { value: string }>> };

/**
 * The marks that carry no silhouette, taken from the board itself.
 *
 * CLAUDE.md names "sea, wind, weave, reef, depth, the coral fan". The board
 * disagrees on three of them and it is the source of truth: `weave` HAS a
 * closed diamond silhouette (it is the Bedouin woven divider, a filled
 * repeating diamond), while `palm` and `offline` are line-only and unlisted.
 * This list is the board's; CLAUDE.md's needs correcting to match.
 */
const ABSTRACT = ['sea', 'coralFan', 'reef', 'depth', 'wind', 'palm', 'offline'] as const;

const everyGlyph: [string, MarkGlyph][] = [
  ...Object.entries(MARKS),
  ...Object.entries(ILLOS),
  ...Object.entries(CATEGORY_MARKS),
];

describe('the inventory', () => {
  it('carries the 37 marks, 6 illustrations and 12 category marks', () => {
    expect(Object.keys(MARKS)).toHaveLength(37);
    expect(Object.keys(ILLOS)).toHaveLength(6);
    expect(Object.keys(CATEGORY_MARKS)).toHaveLength(12);
  });

  it('names acronyms as identifiers, not as camelCase accidents', () => {
    // A regression: the first generator turned "SOS" into `sOS`.
    expect(MARKS).toHaveProperty('sos');
    expect(MARKS).toHaveProperty('firstAid');
    expect(MARKS).toHaveProperty('noFly');
    expect(MARKS).not.toHaveProperty('sOS');
  });
});

describe('the construction rule', () => {
  it('gives every glyph a line path', () => {
    for (const [name, glyph] of everyGlyph) {
      expect(glyph.d.length, `${name} has no line`).toBeGreaterThan(0);
    }
  });

  it('gives a silhouette to everything except the abstract marks', () => {
    for (const name of ABSTRACT) {
      expect(MARKS[name].shape, `${name} should be line-only`).toBe('');
    }
    const missingShape = Object.entries(MARKS)
      .filter(([, glyph]) => glyph.shape === '')
      .map(([name]) => name);
    expect(missingShape.sort()).toEqual([...ABSTRACT].sort());
  });

  it('never reuses the line as the shape without closing it', () => {
    // A silhouette is a filled region: if it is byte-identical to the line and
    // does not close, the mark is a fattened stroke rather than a shape.
    for (const [name, glyph] of everyGlyph) {
      if (glyph.shape === '' || glyph.shape !== glyph.d) continue;
      expect(glyph.shape.trimEnd().toLowerCase().endsWith('z'), `${name} is an open shape`).toBe(
        true,
      );
    }
  });
});

describe('tints are tokens, never hexes', () => {
  it('resolves every tint to a colour token that exists', () => {
    for (const [name, glyph] of everyGlyph) {
      expect(glyph.tint, `${name} carries a hex`).not.toMatch(/^#/);
      const light = tokens.color['light']?.[glyph.tint];
      expect(light, `${name} uses unknown token ${glyph.tint}`).toBeDefined();
    }
  });

  it('keeps the generated module free of hex literals', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../src/marks/data.ts', import.meta.url)),
      'utf8',
    );
    expect(source).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });
});
