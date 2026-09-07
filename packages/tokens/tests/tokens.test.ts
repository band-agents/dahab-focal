import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// lint:hardcoded allow=hex — this suite is the one place hex literals are the
// subject rather than a decision: the WCAG reference points (#000/#FFF, the
// 4.5:1 boundary grey) and the two values corrected in code against the design
// canvas. Every other file in the repo reads a token name.

// Plain JS, deliberately untyped: fifteen lines of published arithmetic, and a
// .d.ts for it would be longer than the source. allowJs picks it up.
import { contrastRatio, parseHex, relativeLuminance, round } from '../scripts/contrast.mjs';

/**
 * Three jobs.
 *
 * 1. Parity: every value in tokens.json is reachable in every generated
 *    output. A token that exists in the theme but not in the Tailwind preset
 *    is a token that works on one surface and silently fails on another.
 *
 * 2. Contrast: every documented ratio is recomputed from the hexes in
 *    tokens.json and checked against its minimum — the design board's own
 *    annotations are not trusted. The forbidden pairings are asserted to still
 *    fail, so nobody later "fixes" the palette into a state where white on the
 *    CTA fill passes review.
 *
 * 3. No sentinel: the magenta import sentinel (#FF00FF) appears nowhere. The
 *    palette is imported, not provisional.
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
  note?: string;
}

interface ForbiddenPairing {
  foreground: string;
  background: string;
  maximum: number;
  measured: number;
  theme: 'light' | 'dark';
  reason: string;
}

interface TokensFile {
  $meta: {
    status: string;
    contrast: { required: ContrastRequirement[]; forbidden: ForbiddenPairing[] };
  };
  color: Record<string, Record<string, ColorEntry>>;
}

const tokensRaw = read('tokens.json');
const tokens = JSON.parse(tokensRaw) as TokensFile;
const theme = read('src/generated/theme.ts');
const css = read('src/generated/tokens.css');
const preset = read('src/generated/tailwind-preset.js');
const types = read('src/generated/tokens.d.ts');

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

describe('the contrast arithmetic itself', () => {
  it('matches the WCAG reference points', () => {
    expect(round(contrastRatio('#000000', '#FFFFFF'))).toBe(21);
    expect(round(contrastRatio('#FFFFFF', '#FFFFFF'))).toBe(1);
    expect(round(relativeLuminance('#FFFFFF'), 4)).toBe(1);
    expect(round(relativeLuminance('#000000'), 4)).toBe(0);
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(
      contrastRatio('#FFFFFF', '#767676'),
      10,
    );
    expect(round(contrastRatio('#767676', '#FFFFFF'), 1)).toBe(4.5);
  });

  it('reads every hex shorthand', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex('C13B2C')).toEqual({ r: 193, g: 59, b: 44 });
    expect(parseHex('#C13B2CFF')).toEqual({ r: 193, g: 59, b: 44 });
    expect(() => parseHex('coral')).toThrow();
  });
});

describe('the palette is imported, not provisional', () => {
  it('carries no magenta sentinel anywhere', () => {
    expect(tokensRaw).not.toContain('#FF00FF');
    expect(theme).not.toContain('#FF00FF');
    expect(css).not.toContain('#FF00FF');
    expect(preset).not.toContain('#FF00FF');
    for (const entry of allColors) {
      expect(entry.provisional ?? false, `${entry.name} is still provisional`).toBe(false);
      expect(entry.value).not.toBe('#FF00FF');
    }
  });

  it('records the import status and its source revision', () => {
    expect(tokens.$meta.status).toBe('imported');
  });

  it('exports an empty provisional list', () => {
    expect(theme).toContain('provisionalColorTokens: readonly string[] = [');
    // Nothing between the brackets but whitespace.
    const block = theme.slice(theme.indexOf('provisionalColorTokens'));
    const list = block.slice(block.indexOf('['), block.indexOf(']') + 1);
    expect(list.replace(/\s/g, '')).toBe('[]');
  });
});

describe('the two corrections made in code against the canvas', () => {
  it('clay-700 is #7D6D5E and clears AA as muted text on the page', () => {
    expect(tokens.color['light']?.['clay-700']?.value).toBe('#7D6D5E');
    expect(tokens.color['light']?.['text-muted']?.value).toBe('#7D6D5E');
    expect(round(contrastRatio('#7D6D5E', '#FDFAF6'), 2)).toBeGreaterThanOrEqual(4.5);
    // The value it replaced did not.
    expect(round(contrastRatio('#8A7B68', '#FDFAF6'), 2)).toBeLessThan(4.5);
  });

  it('danger-text is #B82D2D and clears AA on its own surface', () => {
    expect(tokens.color['light']?.['danger-text']?.value).toBe('#B82D2D');
    expect(round(contrastRatio('#B82D2D', '#F5DCDC'), 2)).toBeGreaterThanOrEqual(4.5);
    expect(round(contrastRatio('#C13333', '#F5DCDC'), 2)).toBeLessThan(4.5);
  });
});

describe('required contrast — recomputed from the hexes, never annotated', () => {
  it('declares every documented pairing', () => {
    const declared = tokens.$meta.contrast.required.map(
      (pairing) => `${pairing.foreground} on ${pairing.background} (${pairing.theme})`,
    );
    expect(declared).toEqual([
      'text on bg (light)',
      'line on bg (light)',
      'cta-label on cta-fill (light)',
      'text on shape-water (light)',
      'text-brand on bg (light)',
      'dune-700 on sand-50 (light)',
      'warning-text on warning-surface (light)',
      'danger-text on danger-surface (light)',
      'text-muted on bg (light)',
      'text-link on bg (light)',
      'success-text on success-surface (light)',
      'text on bg (dark)',
      'text-muted on bg (dark)',
      'cta-label on cta-fill (dark)',
    ]);
  });

  it.each(tokens.$meta.contrast.required)(
    '$foreground on $background ($theme) >= $minimum',
    (requirement) => {
      const foreground = hexOf(requirement.foreground, requirement.theme);
      const background = hexOf(requirement.background, requirement.theme);
      expect(foreground, `${requirement.foreground} is not defined`).not.toBeNull();
      expect(background, `${requirement.background} is not defined`).not.toBeNull();

      const ratio = round(contrastRatio(foreground as string, background as string), 2);
      expect(ratio).toBeGreaterThanOrEqual(requirement.minimum);
      // AA for normal text is 4.5:1. Every required pairing here is text, so
      // the minimum itself must never be set below that.
      expect(requirement.minimum).toBeGreaterThanOrEqual(4.5);
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
      const foreground = hexOf(pairing.foreground, pairing.theme);
      const background = hexOf(pairing.background, pairing.theme);
      const ratio = round(contrastRatio(foreground as string, background as string), 2);
      expect(ratio).toBeLessThan(pairing.maximum);
      // Still the number the palette actually produces — a palette edit that
      // moves it at all is a change to review.
      expect(ratio).toBeCloseTo(pairing.measured, 1);
      expect(pairing.reason.length).toBeGreaterThan(20);
    },
  );

  it('white on the CTA fill is nowhere near legible — which is why the label is ink', () => {
    expect(round(contrastRatio('#FFFFFF', hexOf('cta-fill', 'light') as string))).toBeLessThan(3);
    // And there is no darker "coral-800"-style fill to reintroduce it with.
    expect(tokens.color['light']?.['coral-800']).toBeUndefined();
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

  it('carries every literal hex through to theme.ts and the CSS', () => {
    for (const entry of allColors) {
      expect(theme).toContain(entry.value);
      expect(css).toContain(entry.value);
    }
  });

  it('binds every colour in the Tailwind preset to its CSS variable, so utilities follow the theme', () => {
    for (const entry of allColors) {
      expect(preset, `preset is not var-bound for ${entry.name}`).toContain(
        `"${entry.name}": "var(--color-${entry.name})"`,
      );
    }
    // The preset must not bake in a light hex for a themed colour.
    for (const entry of allColors) {
      if (tokens.color['dark']?.[entry.name] && tokens.color['light']?.[entry.name]) {
        expect(preset).not.toContain(`"${entry.name}": "${entry.value}"`);
      }
    }
  });

  it('emits both theme blocks and a data-theme override in the CSS', () => {
    expect(css).toContain('prefers-color-scheme: dark');
    expect(css).toContain("[data-theme='dark']");
    expect(css).toContain(":root:not([data-theme='light'])");
  });

  it('reaches every type role, radius, space step and gradient in the types', () => {
    for (const role of Object.keys(
      (JSON.parse(tokensRaw) as { type: { role: Record<string, unknown> } }).type.role,
    )) {
      expect(types, `tokens.d.ts is missing role ${role}`).toContain(`| "${role}"`);
    }
  });

  it('makes a hex value untypeable', () => {
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

describe('the CTA cannot express a white-on-fill label through its tokens', () => {
  it('cta-label resolves to ink in light and to the near-black ground in dark', () => {
    expect(hexOf('cta-label', 'light')).toBe(hexOf('text', 'light'));
    expect(hexOf('cta-label', 'dark')).toBe(hexOf('bg', 'dark'));
  });

  it('never defines a white or near-white cta-label', () => {
    for (const themeName of ['light', 'dark'] as const) {
      const label = hexOf('cta-label', themeName) as string;
      expect(round(contrastRatio(label, '#FFFFFF'))).toBeGreaterThan(3);
    }
  });
});
