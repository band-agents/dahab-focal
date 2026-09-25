#!/usr/bin/env node
/**
 * Fetch the three bundled typefaces from Google Fonts as self-hosted woff2,
 * one file per (family, script), and write a manifest the token build turns
 * into @font-face blocks.
 *
 *   node scripts/fetch-fonts.mjs
 *
 * Self-hosted rather than linked, because the apps have to work on a patchy
 * connection in Dahab and a third-party font host is one more thing to be
 * offline (CLAUDE.md: offline is a designed state).
 *
 * Subsetting is the point. Rubik must carry latin, latin-ext, cyrillic AND
 * arabic — that coverage is why the design chose one family for all three
 * scripts, and a latin-only subset silently breaks Russian and Arabic. Each
 * subset is a separate @font-face with its own unicode-range, so a German
 * reader never downloads the Arabic glyphs.
 *
 * All three faces are SIL Open Font License 1.1, which permits self-hosting.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fontsDir = fileURLToPath(new URL('../fonts', import.meta.url));

/** A recent Chrome UA, or Google serves ttf instead of woff2. */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

/**
 * `weights` is the range the app actually uses. Google serves these as
 * variable fonts, so one file per subset covers the whole range and the
 * @font-face declares `font-weight: min max`.
 *
 * `subsets` is deliberate, not "everything Google has":
 *   - Rubik ships hebrew and cyrillic-ext too. Neither is one of our seven
 *     locales; Russian lives entirely in `cyrillic`.
 *   - Baloo 2 ships devanagari. The display face is Latin-only here; Arabic
 *     display is Baloo Bhaijaan 2.
 */
const FAMILIES = [
  {
    family: 'Baloo 2',
    slug: 'baloo2',
    weights: [400, 800],
    role: 'display',
    subsets: ['latin', 'latin-ext'],
  },
  {
    family: 'Rubik',
    slug: 'rubik',
    weights: [300, 900],
    role: 'ui',
    subsets: ['latin', 'latin-ext', 'cyrillic', 'arabic'],
  },
  {
    family: 'Baloo Bhaijaan 2',
    slug: 'baloo-bhaijaan2',
    weights: [400, 800],
    role: 'arabicDisplay',
    subsets: ['arabic', 'latin'],
  },
  /*
   * The console superfamily. The admin console and the operator app are a
   * separate visual system from the traveller app (tokens.json `c-*`), and
   * they need a grotesque rather than Baloo's round terminals.
   *
   * Plex rather than the Public Sans in the mock-up: Public Sans publishes no
   * cyrillic subset, and ru-RU is one of the seven locales — Russian would
   * have fallen silently back to Rubik mid-sentence. Plex Sans carries latin,
   * latin-ext and cyrillic, Plex Sans Arabic carries the Arabic, and Plex Mono
   * the figures: one skeleton across all three.
   */
  {
    family: 'IBM Plex Sans',
    slug: 'plex-sans',
    weights: [400, 600],
    role: 'console',
    subsets: ['latin', 'latin-ext', 'cyrillic'],
  },
  {
    family: 'IBM Plex Sans Arabic',
    slug: 'plex-sans-arabic',
    weights: [400, 600],
    variable: false,
    role: 'consoleArabic',
    subsets: ['arabic', 'latin'],
  },
  {
    // One weight: nothing in the console needs a bold figure, and emphasis
    // there is size and colour.
    family: 'IBM Plex Mono',
    slug: 'plex-mono',
    weights: [400, 400],
    variable: false,
    role: 'figure',
    subsets: ['latin'],
  },
];

/** Parse the `/* subset *\/ @font-face { … }` blocks Google returns. */
function parseCss(css) {
  const blocks = [];
  const pattern =
    /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
  let match;
  while ((match = pattern.exec(css)) !== null) {
    const [, subset, body] = match;
    const url = /src:\s*url\(([^)]+)\)/.exec(body)?.[1];
    const unicodeRange = /unicode-range:\s*([^;]+);/.exec(body)?.[1]?.trim();
    const style = /font-style:\s*([^;]+);/.exec(body)?.[1]?.trim() ?? 'normal';
    if (url === undefined || unicodeRange === undefined) continue;
    blocks.push({ subset, url, unicodeRange, style });
  }
  return blocks;
}

async function main() {
  await mkdir(fontsDir, { recursive: true });
  const manifest = [];

  for (const spec of FAMILIES) {
    const [min, max] = spec.weights;

    /*
     * One request per file to fetch. A variable family answers the whole range
     * in a single file, so that is one request covering `min..max`. A family
     * Google still publishes as separate statics rejects a range outright with
     * a 400, so each weight is asked for on its own and lands in its own file —
     * the weight goes in the filename, and the manifest records a range of one
     * so the generated @font-face declares a single weight rather than lying
     * about covering the span between them.
     */
    const cuts =
      spec.variable === false
        ? [...new Set([min, max])].map((weight) => ({
            axis: `wght@${weight}`,
            weightRange: [weight, weight],
            suffix: `-${weight}`,
          }))
        : [{ axis: `wght@${min}..${max}`, weightRange: [min, max], suffix: '' }];

    for (const cut of cuts) {
      const query = `family=${encodeURIComponent(spec.family)}:${cut.axis}&display=swap`;
      const cssUrl = `https://fonts.googleapis.com/css2?${query}`;

      const css = await fetch(cssUrl, { headers: { 'User-Agent': USER_AGENT } }).then((r) => {
        if (!r.ok) {
          throw new Error(
            `${spec.family} (${cut.axis}): Google returned ${r.status}` +
              (spec.variable === false ? '' : ' — is it a static family? Set variable: false.'),
          );
        }
        return r.text();
      });

      const blocks = parseCss(css);
      const wanted = spec.subsets.map((subset) => {
        const block = blocks.find((candidate) => candidate.subset === subset);
        if (block === undefined) {
          throw new Error(
            `${spec.family}: Google does not publish a "${subset}" subset. Got: ` +
              `${[...new Set(blocks.map((b) => b.subset))].join(', ')}`,
          );
        }
        return block;
      });

      for (const block of wanted) {
        const file = `${spec.slug}${cut.suffix}-${block.subset}.woff2`;
        const bytes = Buffer.from(
          await fetch(block.url, { headers: { 'User-Agent': USER_AGENT } }).then((r) => {
            if (!r.ok) throw new Error(`${file}: ${r.status}`);
            return r.arrayBuffer();
          }),
        );
        await writeFile(join(fontsDir, file), bytes);

        manifest.push({
          family: spec.family,
          role: spec.role,
          subset: block.subset,
          file,
          bytes: bytes.length,
          weightRange: cut.weightRange,
          style: block.style,
          unicodeRange: block.unicodeRange,
        });

        console.log(
          `  ${file.padEnd(32)} ${String(Math.round(bytes.length / 1024)).padStart(4)} kB  ${block.subset}`,
        );
      }
    }
  }

  manifest.sort((a, b) => a.file.localeCompare(b.file));
  await writeFile(
    join(fontsDir, 'manifest.json'),
    `${JSON.stringify(
      {
        $note:
          'Generated by scripts/fetch-fonts.mjs. The token build turns this into ' +
          'src/generated/fonts.css. Every family here is SIL OFL 1.1 — the ' +
          'three Baloo/Rubik faces for the traveller app, the three IBM Plex ' +
          'faces for the console.',
        $generated: new Date().toISOString().slice(0, 10),
        faces: manifest,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  const total = manifest.reduce((sum, face) => sum + face.bytes, 0);
  console.log(
    `\nfetch-fonts: ${manifest.length} files, ${Math.round(total / 1024)} kB total ` +
      `(a Latin reader downloads only the latin subsets).`,
  );
}

await main();
