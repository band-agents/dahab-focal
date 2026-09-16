/**
 * The app icon, the adaptive icon and the splash, drawn from the design
 * system rather than by hand.
 *
 *   node scripts/make-icons.mjs
 *
 * The `compass` mark is the operator app's own — the same one the rail and
 * the sign-in header carry — and it is drawn here the way `<Mark>` draws it
 * everywhere else: a filled silhouette in its family tint, offset +4/+4, with
 * the 3px ink-line stroked over the top. Nothing is redrawn for the icon, so
 * a change on the design board reaches the home screen too.
 *
 * Rasterised through headless Chrome because this machine has no image
 * toolchain. Chrome is already a dependency of `pnpm shoot`.
 */
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const assets = resolve(here, '../assets');
const tmp = resolve(here, '../.icon-build');

/** Read straight out of the token package, never retyped. */
const { colors } = await import('@dahab/tokens/theme');
const { MARKS } = await import('@dahab/tokens/marks');

const CREAM = colors.light['cream-50'];
const INK_LINE = colors.light['ink-line'];
const SHAPE_WATER = colors.light['shape-water'];
const INFO_SURFACE = colors.light['info-surface'];

/** The mark's own construction rule, from packages/ui/src/marks/Mark.tsx. */
const VIEWBOX = 100;
const OFFSET = 4;
const STROKE = 3;

function markSvg(name, { size, ground, pad }) {
  const glyph = MARKS[name];
  if (glyph === undefined) throw new Error(`No mark called ${name}.`);

  const tint = glyph.tint === 'shape-water' ? SHAPE_WATER : SHAPE_WATER;
  const inner = size - pad * 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${ground}"/>
  <svg x="${pad}" y="${pad}" width="${inner}" height="${inner}" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}">
    ${glyph.shape === '' ? '' : `<g transform="translate(${OFFSET} ${OFFSET})"><path d="${glyph.shape}" fill="${tint}"/></g>`}
    <path d="${glyph.d}" fill="none" stroke="${INK_LINE}" stroke-width="${STROKE}"
          stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</svg>`;
}

/**
 * Each output, at the size the platform actually wants.
 *
 * The adaptive icon's mark sits well inside its square: Android masks it to a
 * circle, a squircle or a teardrop depending on the launcher, and anything
 * near the edge is what gets cut off.
 */
const OUTPUTS = [
  { file: 'icon.png', size: 1024, ground: INFO_SURFACE, pad: 200 },
  { file: 'adaptive-icon.png', size: 1024, ground: INFO_SURFACE, pad: 290 },
  { file: 'splash-icon.png', size: 512, ground: CREAM, pad: 140 },
  { file: 'favicon.png', size: 48, ground: INFO_SURFACE, pad: 8 },
];

function chrome() {
  const candidates = [
    process.env['CHROME_PATH'],
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ].filter((path) => path !== undefined);
  return candidates;
}

await mkdir(assets, { recursive: true });
await mkdir(tmp, { recursive: true });

let chromePath = null;
for (const candidate of chrome()) {
  try {
    await readFile(candidate);
    chromePath = candidate;
    break;
  } catch {
    // Try the next one.
  }
}
if (chromePath === null) {
  throw new Error(
    'Could not find Chrome. Set CHROME_PATH to its executable and run this again.',
  );
}

for (const output of OUTPUTS) {
  const svg = markSvg('compass', output);
  const svgPath = resolve(tmp, `${output.file}.svg`);
  await writeFile(svgPath, svg, 'utf8');

  await run(chromePath, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--default-background-color=00000000',
    `--screenshot=${resolve(assets, output.file)}`,
    `--window-size=${output.size},${output.size}`,
    `file://${svgPath.replaceAll('\\', '/')}`,
  ]);

  process.stdout.write(`  ${output.file} — ${output.size}×${output.size}\n`);
}

await rm(tmp, { recursive: true, force: true });
process.stdout.write('icons: drawn from the compass mark, tokens and all.\n');
