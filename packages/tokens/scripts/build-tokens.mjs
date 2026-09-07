#!/usr/bin/env node
/**
 * tokens.json -> theme.ts, tokens.css, tailwind-preset.js, tokens.d.ts
 *
 * tokens.json is the only place a visual value is defined (CLAUDE.md). Every
 * consumer reads a generated artefact, so there is exactly one edit that
 * changes a colour and exactly one review that catches it.
 *
 *   node scripts/build-tokens.mjs           write the generated files
 *   node scripts/build-tokens.mjs --check   fail if they are out of date
 *
 * The --check mode is what makes the generated files trustworthy in review: a
 * hand-edited theme.ts fails CI rather than silently diverging from its source.
 *
 * lint:hardcoded allow=hex — the generator quotes example hex values in the
 * documentation it emits. It defines none of them; it copies them out of
 * tokens.json.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const tokensPath = join(packageRoot, 'tokens.json');
const outputDir = join(packageRoot, 'src', 'generated');

const checkOnly = process.argv.includes('--check');

// The parsed token file. Its shape is documented by tokens.json itself and
// asserted by tests/tokens.test.ts; annotating it here would be a second
// description of the same thing, free to drift from the first.
const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'));

const BANNER = `/**
 * GENERATED FILE — do not edit.
 *
 * Source: packages/tokens/tokens.json
 * Regenerate: pnpm --filter @dahab/tokens build
 *
 * Editing this file by hand fails \`pnpm test:tokens\`, which re-runs the
 * generator in --check mode and diffs the result.
 */
`;

// --- flattening -----------------------------------------------------------

/** Entries whose key starts with `$` are documentation, never tokens. */
function isMetaKey(key) {
  return key.startsWith('$');
}

/**
 * A colour entry is `{ value, provisional, note }`. Flattened to
 * `light.coral-500` -> `{ value, provisional }`.
 */
function flattenColors(source) {
  /** @type {Record<string, { value: string, provisional: boolean, note?: string }>} */
  const out = {};
  for (const [theme, entries] of Object.entries(source ?? {})) {
    if (isMetaKey(theme)) continue;
    for (const [name, entry] of Object.entries(entries ?? {})) {
      if (isMetaKey(name)) continue;
      out[`${theme}.${name}`] = {
        value: entry.value,
        provisional: entry.provisional === true,
        ...(entry.note === undefined ? {} : { note: entry.note }),
      };
    }
  }
  return out;
}

/** Generic `{ name: { value, provisional } }` sections: radius, space, … */
function flattenScale(source) {
  /** @type {Record<string, { value: unknown, provisional: boolean }>} */
  const out = {};
  for (const [name, entry] of Object.entries(source ?? {})) {
    if (isMetaKey(name)) continue;
    if (entry === null || typeof entry !== 'object' || !('value' in entry)) continue;
    out[name] = { value: entry.value, provisional: entry.provisional === true };
  }
  return out;
}

const colors = flattenColors(tokens.color);
const families = flattenScale(tokens.type?.family);
const roles = tokens.type?.role ?? {};
const radii = flattenScale(tokens.radius);
const spacing = flattenScale(tokens.space);
const shadows = flattenScale(tokens.shadow);
const gradients = flattenScale(tokens.gradient);
const curves = flattenScale(tokens.motion?.curve);
const durations = flattenScale(tokens.motion?.duration);

/** Token names as they are written in code: `coral-500`, not `light.coral-500`. */
function bareName(qualified) {
  const index = qualified.indexOf('.');
  return index === -1 ? qualified : qualified.slice(index + 1);
}

const lightNames = Object.keys(colors)
  .filter((key) => key.startsWith('light.'))
  .map(bareName);
const darkNames = Object.keys(colors)
  .filter((key) => key.startsWith('dark.'))
  .map(bareName);
const colorNames = [...new Set([...lightNames, ...darkNames])].sort();

// --- generators -----------------------------------------------------------

function quote(value) {
  return JSON.stringify(value);
}

function generateThemeTs() {
  const light = lightNames
    .map((name) => `    ${quote(name)}: ${quote(colors[`light.${name}`].value)},`)
    .join('\n');
  const dark = darkNames
    .map((name) => `    ${quote(name)}: ${quote(colors[`dark.${name}`].value)},`)
    .join('\n');

  const provisional = Object.entries(colors)
    .filter(([, entry]) => entry.provisional)
    .map(([key]) => `  ${quote(bareName(key))},`)
    .join('\n');

  return `${BANNER}
import type { ColorToken, RadiusToken, ShadowToken, SpaceToken, TypeRole } from './tokens.d';

export const colors = {
  light: {
${light}
  },
  dark: {
${dark}
  },
} as const;

export const radii = ${JSON.stringify(mapValues(radii), null, 2)} as const;

export const space = ${JSON.stringify(mapValues(spacing), null, 2)} as const;

export const shadows = ${JSON.stringify(mapValues(shadows), null, 2)} as const;

export const gradients = ${JSON.stringify(mapValues(gradients), null, 2)} as const;

export const fontFamilies = ${JSON.stringify(mapValues(families), null, 2)} as const;

/** Size, line height and letter spacing travel together, per role. */
export const typeRoles = ${JSON.stringify(roles, null, 2)} as const;

export const motion = {
  curves: ${JSON.stringify(mapValues(curves), null, 2)},
  durations: ${JSON.stringify(mapValues(durations), null, 2)},
} as const;

/**
 * Tokens still carrying the provisional sentinel. The gallery renders these
 * with a warning stripe so an unimported value cannot ship unnoticed.
 */
export const provisionalColorTokens: readonly string[] = [
${provisional}
];

export type Theme = 'light' | 'dark';

export function color(token: ColorToken, theme: Theme = 'light'): string {
  const palette = colors[theme] as Record<string, string | undefined>;
  const value = palette[token] ?? (colors.light as Record<string, string | undefined>)[token];
  if (value === undefined) {
    throw new Error(\`Unknown colour token "\${token}". Add it to packages/tokens/tokens.json.\`);
  }
  return value;
}

export type { ColorToken, RadiusToken, ShadowToken, SpaceToken, TypeRole };
`;
}

function mapValues(entries) {
  return Object.fromEntries(Object.entries(entries).map(([key, entry]) => [key, entry.value]));
}

function generateTokensCss() {
  const declarations = (names, theme) =>
    names.map((name) => `  --color-${name}: ${colors[`${theme}.${name}`].value};`).join('\n');

  const scaleDeclarations = (prefix, entries) =>
    Object.entries(entries)
      .map(([name, entry]) => `  --${prefix}-${name}: ${String(entry.value)};`)
      .join('\n');

  const sections = [
    scaleDeclarations('radius', radii),
    scaleDeclarations('space', spacing),
    scaleDeclarations('shadow', shadows),
    scaleDeclarations('gradient', gradients),
    scaleDeclarations('font', families),
    scaleDeclarations('ease', curves),
    scaleDeclarations('duration', durations),
  ].filter((section) => section.length > 0);

  return `/* GENERATED FILE — do not edit. Source: packages/tokens/tokens.json */

:root {
${declarations(lightNames, 'light')}
${sections.join('\n')}
}

/* An explicit choice wins in both directions; the default is the system one. */
:root:not([data-theme='light']) {
  @media (prefers-color-scheme: dark) {
${darkNames.map((name) => `    --color-${name}: ${colors[`dark.${name}`].value};`).join('\n')}
  }
}

:root[data-theme='dark'] {
${declarations(darkNames, 'dark')}
}
`;
}

function generateTailwindPreset() {
  // Colours resolve to the CSS custom properties emitted in tokens.css, so a
  // single utility class (`bg-surface`) follows the active theme instead of
  // baking in the light hex. The literal values live in theme.ts for the RN
  // StyleSheet path and in tokens.css for the web. Spacing, radii, type and
  // shadows are not themed and stay literal.
  const colorEntries = colorNames
    .map((name) => `      ${quote(name)}: ${quote(`var(--color-${name})`)},`)
    .join('\n');

  const fontSizeEntries = Object.entries(roles)
    .map(([name, role]) => {
      const size = role.fontSize ?? role.size;
      const lineHeight = role.lineHeight;
      const letterSpacing = role.letterSpacing;
      return `      ${quote(name)}: [${quote(String(size))}, ${JSON.stringify({
        ...(lineHeight === undefined ? {} : { lineHeight: String(lineHeight) }),
        ...(letterSpacing === undefined ? {} : { letterSpacing: String(letterSpacing) }),
      })}],`;
    })
    .join('\n');

  return `/* GENERATED FILE — do not edit. Source: packages/tokens/tokens.json */

/**
 * Consumed by every surface through @dahab/config/tailwind. Colours, spacing,
 * radii, type and shadows all arrive here and nowhere else.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
${colorEntries}
      },
      borderRadius: ${JSON.stringify(mapValues(radii), null, 8).replace(/\n/g, '\n      ')},
      spacing: ${JSON.stringify(mapValues(spacing), null, 8).replace(/\n/g, '\n      ')},
      boxShadow: ${JSON.stringify(mapValues(shadows), null, 8).replace(/\n/g, '\n      ')},
      backgroundImage: ${JSON.stringify(mapValues(gradients), null, 8).replace(/\n/g, '\n      ')},
      fontFamily: ${JSON.stringify(
        Object.fromEntries(
          Object.entries(mapValues(families)).map(([key, value]) => [key, [value]]),
        ),
        null,
        8,
      ).replace(/\n/g, '\n      ')},
      fontSize: {
${fontSizeEntries}
      },
      transitionTimingFunction: ${JSON.stringify(mapValues(curves), null, 8).replace(/\n/g, '\n      ')},
      transitionDuration: ${JSON.stringify(mapValues(durations), null, 8).replace(/\n/g, '\n      ')},
    },
  },
};
`;
}

function generateTokensDts() {
  const union = (names) =>
    names.length === 0 ? 'never' : names.map((name) => `  | ${quote(name)}`).join('\n');

  return `${BANNER}
/**
 * Literal unions, so \`color="coral-500"\` autocompletes and
 * \`color="#FF6B5A"\` is a type error — a hex value simply has no type here.
 */

export type ColorToken =
${union(colorNames)};

export type RadiusToken =
${union(Object.keys(radii).sort())};

export type SpaceToken =
${union(Object.keys(spacing).sort())};

export type ShadowToken =
${union(Object.keys(shadows).sort())};

export type GradientToken =
${union(Object.keys(gradients).sort())};

export type TypeRole =
${union(Object.keys(roles).sort())};

export type FontFamilyToken =
${union(Object.keys(families).sort())};

export type MotionCurve =
${union(Object.keys(curves).sort())};

export type MotionDuration =
${union(Object.keys(durations).sort())};
`;
}

// --- write or check -------------------------------------------------------

const artefacts = [
  { name: 'theme.ts', contents: generateThemeTs() },
  { name: 'tokens.css', contents: generateTokensCss() },
  { name: 'tailwind-preset.js', contents: generateTailwindPreset() },
  { name: 'tokens.d.ts', contents: generateTokensDts() },
];

if (checkOnly) {
  const stale = [];
  for (const artefact of artefacts) {
    const path = join(outputDir, artefact.name);
    if (!existsSync(path)) {
      stale.push(`${artefact.name} (missing)`);
      continue;
    }
    if (readFileSync(path, 'utf8') !== artefact.contents) {
      stale.push(`${artefact.name} (differs from tokens.json)`);
    }
  }
  if (stale.length > 0) {
    console.error('build-tokens --check: generated files are out of date:\n');
    for (const item of stale) console.error(`  ${item}`);
    console.error('\nRun: pnpm --filter @dahab/tokens build');
    process.exit(1);
  }
  console.log(`build-tokens --check: OK — ${artefacts.length} artefacts match tokens.json.`);
  process.exit(0);
}

mkdirSync(outputDir, { recursive: true });
for (const artefact of artefacts) {
  writeFileSync(join(outputDir, artefact.name), artefact.contents, 'utf8');
}

const provisionalCount = Object.values(colors).filter((entry) => entry.provisional).length;
console.log(
  `build-tokens: wrote ${artefacts.map((a) => a.name).join(', ')} — ` +
    `${colorNames.length} colours, ${Object.keys(roles).length} type roles, ` +
    `${Object.keys(spacing).length} spacing steps.`,
);
if (provisionalCount > 0) {
  console.log(
    `build-tokens: ${provisionalCount} colour token(s) still provisional (${tokens.$meta.status}).`,
  );
}
