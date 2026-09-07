#!/usr/bin/env node
/**
 * Night Dive gap analysis.
 *
 *   node scripts/propose-night.mjs
 *
 * Computes only. Nothing here writes tokens.json: the Claude Design canvas is
 * the source of truth, so this produces candidates for the owner to push
 * there, after which the tokens are re-imported (docs/CANVAS-FIXES.md).
 *
 * Two different jobs, and the distinction matters:
 *
 *   A. Tokens the canvas CSS ALREADY gives a night value that the DTCG JSON
 *      omits. Nothing is invented — the value is verified against both night
 *      grounds and adopted.
 *
 *   B. Tokens with no night value anywhere. Only these are proposed, in the
 *      same hue, and only after saying what the bar is and why.
 *
 * Where a value is proposed, the method is: convert to OKLCH, hold the hue,
 * keep the most chroma sRGB allows at each lightness, and walk lightness until
 * the bar is met against BOTH night grounds — `bg` #0A2422 and `surface`
 * #0F2E2E — because a strip sits on the raised surface while a link sits on
 * the page.
 *
 * OKLCH rather than HSL: holding H in HSL while changing L visibly shifts the
 * colour, and "the same hue, adjusted" is the promise being made.
 *
 * lint:hardcoded allow=hex — the hex literals here are transcribed from the
 * canvas's own `[data-theme="night-dive"]` block so they can be verified, and
 * the two night grounds are named in prose. This script defines no visual
 * value: it reads tokens.json and prints a table for the designer.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { contrastRatio, parseHex, round } from './contrast.mjs';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const tokens = JSON.parse(readFileSync(join(packageRoot, 'tokens.json'), 'utf8'));

const light = tokens.color.light;
const night = tokens.color.dark;

const NIGHT_BG = night.bg.value;
const NIGHT_SURFACE = night.surface.value;

const TEXT_BAR = 4.5;
const NON_TEXT_BAR = 3.0;

// --- OKLab / OKLCH (Björn Ottosson) ---------------------------------------

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToOklch(hex) {
  const { r, g, b } = parseHex(hex);
  const lr = toLinear(r / 255);
  const lg = toLinear(g / 255);
  const lb = toLinear(b / 255);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  return { L, C: Math.hypot(a, bb), H: Math.atan2(bb, a) };
}

function oklchToHex({ L, C, H }) {
  const a = C * Math.cos(H);
  const b = C * Math.sin(H);

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const channels = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(toSrgb);

  if (channels.some((c) => c < -0.0015 || c > 1.0015)) return null;

  return `#${channels
    .map((c) =>
      Math.round(Math.min(1, Math.max(0, c)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`.toUpperCase();
}

/** The most chroma that stays in sRGB at this lightness and hue. */
function maxChromaAt(L, H, ceiling) {
  let low = 0;
  let high = ceiling;
  for (let step = 0; step < 24; step += 1) {
    const mid = (low + high) / 2;
    if (oklchToHex({ L, C: mid, H }) === null) high = mid;
    else low = mid;
  }
  return low;
}

function describe(hex) {
  return {
    hex,
    onBg: round(contrastRatio(hex, NIGHT_BG), 2),
    onSurface: round(contrastRatio(hex, NIGHT_SURFACE), 2),
  };
}

/**
 * Walk lightness in `direction` until the value clears `bar` against both
 * grounds, keeping as much chroma as the gamut allows at each step.
 */
function search(sourceHex, bar, direction = 'lighter') {
  const source = hexToOklch(sourceHex);
  const step = direction === 'lighter' ? 0.002 : -0.002;

  for (let L = source.L; L >= 0 && L <= 1; L += step) {
    const C = Math.min(source.C, maxChromaAt(L, source.H, source.C));
    const candidate = oklchToHex({ L, C, H: source.H });
    if (candidate === null) continue;

    const result = describe(candidate);
    if (result.onBg >= bar && result.onSurface >= bar) {
      return { ...result, chromaKept: round((C / source.C) * 100, 0) };
    }
  }
  return null;
}

/**
 * A tinted panel, not a beacon. Night's own `surface-raised` sits at this
 * remove from `bg`, and a status strip should read as the same kind of lift
 * with a hue on it — a pale mint strip on a near-black page is a hole in the
 * screen, whatever its contrast ratio.
 */
function matchLift(sourceHex, targetRatio) {
  const source = hexToOklch(sourceHex);
  let best = null;

  for (let L = 0.05; L <= 0.75; L += 0.002) {
    const C = Math.min(source.C, maxChromaAt(L, source.H, source.C));
    const candidate = oklchToHex({ L, C, H: source.H });
    if (candidate === null) continue;

    const ratio = contrastRatio(candidate, NIGHT_BG);
    const distance = Math.abs(ratio - targetRatio);
    if (best === null || distance < best.distance) {
      best = { ...describe(candidate), distance, chromaKept: round((C / source.C) * 100, 0) };
    }
  }
  return best;
}

/** Ink that has to clear 4.5 on its own strip, as well as on both grounds. */
function inkFor(sourceHex, surfaceHex) {
  const source = hexToOklch(sourceHex);

  for (let L = source.L; L <= 1; L += 0.002) {
    const C = Math.min(source.C, maxChromaAt(L, source.H, source.C));
    const candidate = oklchToHex({ L, C, H: source.H });
    if (candidate === null) continue;

    const onStrip = contrastRatio(candidate, surfaceHex);
    const result = describe(candidate);
    if (onStrip >= TEXT_BAR && result.onBg >= TEXT_BAR && result.onSurface >= TEXT_BAR) {
      return { ...result, onStrip: round(onStrip, 2), chromaKept: round((C / source.C) * 100, 0) };
    }
  }
  return null;
}

// --- A. night values the canvas CSS already has, missing from the JSON ----

/**
 * Read off `[data-theme="night-dive"]` in dahab-focal.tokens.css. These are
 * the designer's own values; the only defect is that the DTCG JSON omits them,
 * so `color.night` has no counterpart and the light value leaks through.
 */
const CSS_NIGHT_ORPHANS = [
  { path: 'color.night.text-link', value: '#7FD8D0', kind: 'text', cssKey: '--df-text-link' },
  { path: 'color.night.text-brand', value: '#E8A99C', kind: 'text', cssKey: '--df-text-brand' },
  { path: 'color.night.focus-ring', value: '#7FD8D0', kind: 'nonText', cssKey: '--df-focus-ring' },
  { path: 'color.night.cta-edge', value: '#E8A99C', kind: 'nonText', cssKey: '--df-cta-edge' },
  {
    path: 'color.night.cta-fill-pressed',
    value: '#E8A99C',
    kind: 'nonText',
    cssKey: '--df-cta-fill-pressed',
  },
];

console.log(`Night grounds: bg ${NIGHT_BG}, surface ${NIGHT_SURFACE}`);
console.log(
  `Reference lift: surface-raised ${night['surface-raised'].value} is ` +
    `${round(contrastRatio(night['surface-raised'].value, NIGHT_BG), 2)}:1 on bg.\n`,
);

console.log('## A. Already in the canvas CSS — copy into the JSON, nothing invented\n');
console.log('| Token path | CSS key | Value | on bg | on surface | Bar | Verdict |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const item of CSS_NIGHT_ORPHANS) {
  const bar = item.kind === 'text' ? TEXT_BAR : NON_TEXT_BAR;
  const result = describe(item.value);
  const passes = result.onBg >= bar && result.onSurface >= bar;
  console.log(
    `| \`${item.path}\` | \`${item.cssKey}\` | \`${item.value}\` | ${result.onBg} | ` +
      `${result.onSurface} | ${bar} | ${passes ? 'passes' : '**FAILS**'} |`,
  );
}

// --- B. no night value anywhere -------------------------------------------

const liftTarget = contrastRatio(night['surface-raised'].value, NIGHT_BG);

console.log('\n## B. No night value anywhere — proposed\n');
console.log('### Status strips (surface, then the ink that sits on it)\n');
console.log('| Token path | Light value | Proposed | on bg | on surface | on its own strip |');
console.log('| --- | --- | --- | --- | --- | --- |');

for (const status of ['success', 'warning', 'danger', 'info']) {
  const surfaceSource = light[`${status}-surface`];
  const textSource = light[`${status}-text`];
  if (surfaceSource === undefined || textSource === undefined) continue;

  const surface = matchLift(surfaceSource.value, liftTarget);
  const ink = surface === null ? null : inkFor(textSource.value, surface.hex);

  console.log(
    `| \`color.night.${status}-surface\` | \`${surfaceSource.value}\` | \`${surface?.hex ?? '—'}\` | ` +
      `${surface?.onBg ?? '—'} | ${surface?.onSurface ?? '—'} | — |`,
  );
  console.log(
    `| \`color.night.${status}-text\` | \`${textSource.value}\` | \`${ink?.hex ?? '**none in hue**'}\` | ` +
      `${ink?.onBg ?? '—'} | ${ink?.onSurface ?? '—'} | ${ink?.onStrip ?? '—'} |`,
  );
}

console.log('\n### Category surfaces and offset shapes\n');
console.log('| Token path | Light value | Proposed | on bg | on surface | Bar |');
console.log('| --- | --- | --- | --- | --- | --- |');
for (const name of Object.keys(light).filter((key) => key.startsWith('cat-'))) {
  const source = light[name];
  const isSurface = name.endsWith('-surface');
  const proposal = isSurface
    ? matchLift(source.value, liftTarget)
    : search(source.value, NON_TEXT_BAR, 'darker') ?? describe(source.value);
  console.log(
    `| \`color.night.${name}\` | \`${source.value}\` | \`${proposal?.hex ?? '—'}\` | ` +
      `${proposal?.onBg ?? '—'} | ${proposal?.onSurface ?? '—'} | ${isSurface ? 'lift' : NON_TEXT_BAR} |`,
  );
}

console.log('\n### Data viz — non-text graphics, 3:1\n');
console.log('| Token path | Light value | on bg | on surface | Verdict |');
console.log('| --- | --- | --- | --- | --- |');
for (const name of Object.keys(light).filter((key) => key.startsWith('viz-'))) {
  const source = light[name];
  const result = describe(source.value);
  const passes = result.onBg >= NON_TEXT_BAR && result.onSurface >= NON_TEXT_BAR;
  console.log(
    `| \`color.night.${name}\` | \`${source.value}\` | ${result.onBg} | ${result.onSurface} | ` +
      `${passes ? 'keep the light value' : '**needs a night value**'} |`,
  );
}

// --- C. night values that already exist and fail --------------------------

console.log('\n## C. Night values that exist and fail their bar\n');
console.log('| Token path | Value | on bg | on surface | Bar | Note |');
console.log('| --- | --- | --- | --- | --- | --- |');
for (const [name, bar, note] of [
  ['border-strong', NON_TEXT_BAR, 'the CSS calls it "minimum for the sole boundary of a control"'],
  ['border', NON_TEXT_BAR, 'dividers only, so 1.4.11 does not strictly apply'],
]) {
  const entry = night[name];
  if (entry === undefined) continue;
  const result = describe(entry.value);
  const passes = result.onBg >= bar;
  console.log(
    `| \`color.night.${name}\` | \`${entry.value}\` | ${result.onBg} | ${result.onSurface} | ` +
      `${bar} | ${passes ? 'passes' : '**FAILS** — '}${note} |`,
  );
}
