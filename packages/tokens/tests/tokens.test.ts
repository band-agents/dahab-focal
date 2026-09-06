import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// lint:hardcoded allow=hex — this suite is the one place hex literals are the
// subject rather than a decision: WCAG reference points (#000/#FFF, the 4.5:1
// boundary grey) and the three values the brief states outright. Every other
// file in the repo reads a token name.

// Plain JS, deliberately untyped: fifteen lines of published arithmetic, and
// a .d.ts for it would be longer than the source. allowJs picks it up.
import { contrastRatio, parseHex, relativeLuminance, round } from '../scripts/contrast.mjs';

/**
 * Two jobs.
 *
 * 1. Parity: every value in tokens.json is reachable in every generated
 *    output. A token that exists in the theme but not in the Tailwind preset
 *    is a token that works on one surface and silently fails on another.
 *
 * 2. Contrast: the ratios measured in the design are asserted, not
 *    recomputed-and-accepted — and the three forbidden pairings are asserted
 *    to still fail, so nobody later "fixes" the palette into a state where
 *    white on coral passes review.
 */

const packageRoot = new URL('../', import.meta.url);
const read = (path: string): string => readFileSync(fileURLToPath(new URL(path, packageRoot)), 'utf8');

interface ColorEntry {
  value: string;
  provisional?: boolean;
  note?: string;
}

interface ContrastRequirement {
  foreground: string;
  background: string;
  minimum: number;
  theme: 'light' | 'dark';
}

interface ForbiddenPairing {
  foreground: string;
  background: string;
  maximum: number;
  measured: number;
  reason: string;
}

interface TokensFile {
  $meta: {
    status: string;
    provisionalSentinel: string;
    contrast: { required: ContrastRequirement[]; forbidden: ForbiddenPairing[] };
  };
  color: Record<string, Record<string, ColorEntry>>;
}

const tokens = JSON.parse(read('tokens.json')) as TokensFile;
const theme = read('src/generated/theme.ts');
const css = read('src/generated/tokens.css');
const preset = read('src/generated/tailwind-preset.js');
const types = read('src/generated/tokens.d.ts');

const AWAITING_DESIGN = tokens.$meta.status === 'awaiting-design-import';

/** Every colour token, flattened, with the theme it came from. */
const allColors = Object.entries(tokens.color).flatMap(([themeName, entries]) =>
  Object.entries(entries)
    .filter(([name]) => !name.startsWith('$'))
    .map(([name, entry]) => ({ theme: themeName, name, ...entry })),
);

/** Resolve a token name to its hex, preferring the named theme. */
function hexOf(name: string, themeName: 'light' | 'dark'): string | null {
  if (name === 'white') return '#FFFFFF';
  if (name === 'black') return '#000000';
  const preferred = tokens.color[themeName]?.[name];
  const fallback = tokens.color['light']?.[name] ?? tokens.color['dark']?.[name];
  return (preferred ?? fallback)?.value ?? null;
}

function isProvisional(name: string, themeName: 'light' | 'dark'): boolean {
  if (name === 'white' || name === 'black') return false;
  const entry = tokens.color[themeName]?.[name] ?? tokens.color['light']?.[name];
  return entry?.provisional === true;
}

describe('the contrast arithmetic itself', () => {
  it('matches the WCAG reference points', () => {
    expect(round(contrastRatio('#000000', '#FFFFFF'))).toBe(21);
    expect(round(contrastRatio('#FFFFFF', '#FFFFFF'))).toBe(1);
    expect(round(relativeLuminance('#FFFFFF'), 4)).toBe(1);
    expect(round(relativeLuminance('#000000'), 4)).toBe(0);
    // Order does not change the ratio.
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(
      contrastRatio('#FFFFFF', '#767676'),
      10,
    );
    // The canonical AA boundary grey on white.
    expect(round(contrastRatio('#767676', '#FFFFFF'), 1)).toBe(4.5);
  });

  it('reads every hex shorthand', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex('FF6B5A')).toEqual({ r: 255, g: 107, b: 90 });
    expect(parseHex('#FF6B5AFF')).toEqual({ r: 255, g: 107, b: 90 });
    expect(() => parseHex('coral')).toThrow();
  });
});

describe('the values the brief states are the values in tokens.json', () => {
  it('coral-500 is #FF6B5A, and white on it really is 2.80', () => {
    expect(tokens.color['light']?.['coral-500']?.value).toBe('#FF6B5A');
    expect(tokens.color['light']?.['coral-500']?.provisional).toBe(false);
    expect(round(contrastRatio('#FFFFFF', '#FF6B5A'))).toBe(2.8);
  });

  it('the dark pair is #E8F1F0 on #04171E, and really is 15.9', () => {
    expect(tokens.color['dark']?.['ink']?.value).toBe('#E8F1F0');
    expect(tokens.color['dark']?.['surface']?.value).toBe('#04171E');
    expect(round(contrastRatio('#E8F1F0', '#04171E'), 1)).toBe(15.9);
  });
});

describe('required contrast', () => {
  it('declares every pairing the brief names', () => {
    const declared = tokens.$meta.contrast.required.map(
      (pairing) => `${pairing.foreground} on ${pairing.background}`,
    );
    expect(declared).toEqual([
      'abyss-900 on sand-50',
      'coral-700 on sand-50',
      'lagoon-600 on sand-50',
      'abyss-900 on coral-500',
      'ink on surface',
    ]);
  });

  it.each(tokens.$meta.contrast.required)(
    '$foreground on $background >= $minimum',
    (requirement) => {
      const foreground = hexOf(requirement.foreground, requirement.theme);
      const background = hexOf(requirement.background, requirement.theme);
      expect(foreground, `${requirement.foreground} is not defined`).not.toBeNull();
      expect(background, `${requirement.background} is not defined`).not.toBeNull();

      if (
        isProvisional(requirement.foreground, requirement.theme) ||
        isProvisional(requirement.background, requirement.theme)
      ) {
        // A sentinel cannot be measured. The assertion is not relaxed — it is
        // deferred, and the suite reports the whole set as pending below so a
        // provisional palette can never read as a pass.
        expect(AWAITING_DESIGN).toBe(true);
        return;
      }

      const ratio = contrastRatio(foreground as string, background as string);
      expect(round(ratio, 2)).toBeGreaterThanOrEqual(requirement.minimum);
    },
  );
});

describe('forbidden pairings must stay forbidden', () => {
  it('declares all three', () => {
    expect(tokens.$meta.contrast.forbidden).toHaveLength(3);
  });

  it.each(tokens.$meta.contrast.forbidden)(
    '$foreground on $background stays below $maximum',
    (pairing) => {
      const foreground = hexOf(pairing.foreground, 'light');
      const background = hexOf(pairing.background, 'light');

      if (isProvisional(pairing.foreground, 'light') || isProvisional(pairing.background, 'light')) {
        expect(AWAITING_DESIGN).toBe(true);
        return;
      }

      const ratio = contrastRatio(foreground as string, background as string);
      // Below the threshold, and still the number the design measured — a
      // palette edit that moves it at all is a change to review.
      expect(round(ratio, 2)).toBeLessThan(pairing.maximum);
      expect(round(ratio, 2)).toBeCloseTo(pairing.measured, 1);
      expect(pairing.reason.length).toBeGreaterThan(20);
    },
  );

  it('white on coral-500 is 2.80, which is why the CTA label is abyss-900', () => {
    expect(round(contrastRatio('#FFFFFF', '#FF6B5A'))).toBeLessThan(3);
  });
});

describe('token parity across every generated output', () => {
  it('reaches every colour in the theme, the CSS, the preset and the types', () => {
    for (const entry of allColors) {
      expect(theme, `theme.ts is missing ${entry.name}`).toContain(`"${entry.name}"`);
      expect(css, `tokens.css is missing ${entry.name}`).toContain(`--color-${entry.name}:`);
      expect(preset, `tailwind-preset.js is missing ${entry.name}`).toContain(`"${entry.name}"`);
      expect(types, `tokens.d.ts is missing ${entry.name}`).toContain(`| "${entry.name}"`);
    }
  });

  it('carries the same hex through to every output', () => {
    for (const entry of allColors) {
      expect(theme).toContain(entry.value);
      expect(css).toContain(entry.value);
      expect(preset).toContain(entry.value);
    }
  });

  it('emits both theme blocks and a data-theme override in the CSS', () => {
    expect(css).toContain('prefers-color-scheme: dark');
    expect(css).toContain("[data-theme='dark']");
    expect(css).toContain(":root:not([data-theme='light'])");
  });

  it('makes a hex value untypeable', () => {
    // Every union member is a token name; no literal hex appears as a type.
    const unionMembers = [...types.matchAll(/\|\s+"([^"]+)"/g)].map((match) => match[1]);
    expect(unionMembers.length).toBeGreaterThan(0);
    for (const member of unionMembers) {
      expect(member).not.toMatch(/^#/);
    }
  });

  it('marks the generated files as generated', () => {
    for (const [name, contents] of Object.entries({ theme, css, preset, types })) {
      expect(contents.slice(0, 400), `${name} has no generated banner`).toContain('GENERATED FILE');
    }
  });
});

describe('the provisional palette is loud about itself', () => {
  it('uses one unmistakable sentinel, not a plausible colour', () => {
    const sentinel = tokens.$meta.provisionalSentinel;
    expect(sentinel).toBe('#FF00FF');
    for (const entry of allColors) {
      if (entry.provisional === true) {
        expect(entry.value, `${entry.name} is provisional but looks plausible`).toBe(sentinel);
      } else {
        expect(entry.value).not.toBe(sentinel);
      }
    }
  });

  it('exports the provisional list so the gallery can flag it on screen', () => {
    expect(theme).toContain('provisionalColorTokens');
    for (const entry of allColors) {
      if (entry.provisional === true) {
        expect(theme).toContain(`  "${entry.name}",`);
      }
    }
  });

  it('reports the design import as the outstanding blocker', () => {
    // This assertion inverts the day the palette lands: the status flips to
    // "imported", this test fails, and whoever flipped it deletes this block
    // having first watched every deferred contrast assertion turn real.
    expect(AWAITING_DESIGN).toBe(true);
    const stillProvisional = allColors.filter((entry) => entry.provisional === true);
    expect(stillProvisional.length).toBeGreaterThan(0);
    console.warn(
      `\n  PENDING DESIGN IMPORT — ${stillProvisional.length} colour tokens are sentinels ` +
        `(${stillProvisional.map((entry) => entry.name).join(', ')}).\n` +
        `  ${tokens.$meta.contrast.required.length} required and ` +
        `${tokens.$meta.contrast.forbidden.length} forbidden contrast assertions are deferred ` +
        `until they are real. See docs/FOUNDATION.md.\n`,
    );
  });
});
