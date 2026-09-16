#!/usr/bin/env node
/**
 * The same three typefaces as TTF, for React Native.
 *
 *   node scripts/fetch-fonts-native.mjs
 *
 * A separate script from `fetch-fonts.mjs`, and a separate set of files,
 * because native needs the opposite of what the web wants on both counts:
 *
 * **Format.** React Native cannot read woff2 at all. It reads ttf and otf,
 * and nothing else. The web fetcher sends a modern Chrome user agent
 * specifically so Google serves woff2; this one sends an ancient one so
 * Google serves ttf.
 *
 * **Subsetting.** The web's whole trick is `unicode-range` — a German reader
 * never downloads the Arabic glyphs. React Native has no such mechanism: one
 * family is one file, and it either has the glyph or renders a box. So Rubik
 * here is the *whole* face, latin through Arabic, because the design chose
 * one family for three scripts and a latin-only file would silently break
 * Russian and Arabic on the one platform that matters most.
 *
 * **Weights.** The web takes the variable font and interpolates. Native's
 * variable-font support is inconsistent across iOS and Android, so each
 * weight the design actually uses is fetched as its own static file and
 * registered under its own name.
 *
 * All three faces are SIL Open Font License 1.1, which permits this.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const nativeDir = fileURLToPath(new URL('../fonts/native', import.meta.url));

/**
 * The user agent that gets TrueType out of Google Fonts.
 *
 * Google picks the format from the UA, and the mapping is not obvious — this
 * was found by asking for the same face as four different browsers and
 * reading `content-type` off each reply:
 *
 *   modern Chrome  → woff2   (what fetch-fonts.mjs wants)
 *   old Firefox    → woff
 *   old Safari     → woff
 *   MSIE 6         → **eot**, which is neither useful nor readable
 *   Android 4      → **ttf** — this one
 *
 * An IE user agent looks like the obvious way to ask for "the old format" and
 * gives the wrong old format. The bytes are checked after downloading anyway,
 * so a change at Google's end fails loudly here rather than silently shipping
 * a phone build with no typeface.
 */
const TTF_USER_AGENT =
  'Mozilla/5.0 (Linux; U; Android 4.0.3; en-us) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30';

/**
 * Only the weights the design system actually names.
 *
 * Rubik 300/400/500 — CLAUDE.md: "500 is the heaviest UI weight". Baloo 2
 * 600 for display, brand and every price. Baloo Bhaijaan 2 600 for Arabic
 * display. Fetching 900 because the variable range goes there would ship
 * three quarters of a megabyte nothing renders.
 */
const FACES = [
  { family: 'Rubik', weight: 300, file: 'Rubik-Light.ttf' },
  { family: 'Rubik', weight: 400, file: 'Rubik-Regular.ttf' },
  { family: 'Rubik', weight: 500, file: 'Rubik-Medium.ttf' },
  { family: 'Baloo 2', weight: 600, file: 'Baloo2-SemiBold.ttf' },
  { family: 'Baloo Bhaijaan 2', weight: 600, file: 'BalooBhaijaan2-SemiBold.ttf' },
  /*
   * The console superfamily, for the operator app. Native has no
   * unicode-range, so each weight is a whole file and only the weights the
   * console actually sets are fetched — 400 and 600 for the two sans faces,
   * one 400 for the figures.
   */
  { family: 'IBM Plex Sans', weight: 400, file: 'IBMPlexSans-Regular.ttf' },
  { family: 'IBM Plex Sans', weight: 600, file: 'IBMPlexSans-SemiBold.ttf' },
  { family: 'IBM Plex Sans Arabic', weight: 400, file: 'IBMPlexSansArabic-Regular.ttf' },
  { family: 'IBM Plex Sans Arabic', weight: 600, file: 'IBMPlexSansArabic-SemiBold.ttf' },
  { family: 'IBM Plex Mono', weight: 400, file: 'IBMPlexMono-Regular.ttf' },
];

/** The first `src: url(…)` Google offers for a single weight. */
function firstUrl(css) {
  return /src:\s*url\(([^)]+)\)/.exec(css)?.[1] ?? null;
}

/**
 * What the downloaded bytes actually are.
 *
 * Neither the URL nor the declaration can be trusted here. Google's legacy
 * endpoint is `fonts.gstatic.com/l/font?kit=…` — no extension — and for this
 * user agent it omits `format()` from the CSS entirely. So the file is read
 * rather than described: the first four bytes say what a font is, and a woff2
 * written to a `.ttf` name would install without complaint and then render
 * nothing at all on a phone.
 */
function sniff(bytes) {
  const tag = bytes.subarray(0, 4).toString('latin1');
  if (tag === 'wOFF') return 'woff';
  if (tag === 'wOF2') return 'woff2';
  if (tag === 'OTTO') return 'opentype';
  if (tag === 'ttcf' || tag === 'true') return 'truetype';
  // The TrueType outline version, 0x00010000.
  if (bytes.readUInt32BE(0) === 0x0001_0000) return 'truetype';
  return `unknown (${[...bytes.subarray(0, 4)].map((b) => b.toString(16)).join(' ')})`;
}

await mkdir(nativeDir, { recursive: true });

const written = [];

for (const face of FACES) {
  const query = `family=${encodeURIComponent(face.family)}:wght@${face.weight}&display=swap`;
  const css = await fetch(`https://fonts.googleapis.com/css2?${query}`, {
    headers: { 'User-Agent': TTF_USER_AGENT },
  }).then((response) => {
    if (!response.ok) throw new Error(`${face.family} ${face.weight}: Google returned ${response.status}`);
    return response.text();
  });

  const url = firstUrl(css);
  if (url === null) {
    throw new Error(`${face.family} ${face.weight}: no font url in Google's response.`);
  }

  const bytes = Buffer.from(
    await fetch(url, { headers: { 'User-Agent': TTF_USER_AGENT } }).then((response) => {
      if (!response.ok) throw new Error(`${face.file}: ${response.status}`);
      return response.arrayBuffer();
    }),
  );

  const format = sniff(bytes);
  if (format !== 'truetype' && format !== 'opentype') {
    throw new Error(
      `${face.family} ${face.weight}: Google served ${format}, which React Native cannot read. ` +
        'The Android user agent is what asks for ttf; check it has not been changed.',
    );
  }

  await writeFile(join(nativeDir, face.file), bytes);
  written.push({ ...face, bytes: bytes.length, format });
  console.log(
    `  ${face.file.padEnd(32)} ${String(Math.round(bytes.length / 1024)).padStart(4)} kB  ${format}`,
  );
}

await writeFile(
  join(nativeDir, 'manifest.json'),
  `${JSON.stringify(
    {
      $note:
        'Generated by scripts/fetch-fonts-native.mjs. TTF for React Native — one file per family and weight, no subsetting, because native has no unicode-range. SIL OFL 1.1.',
      $generated: new Date().toISOString().slice(0, 10),
      faces: written,
    },
    null,
    2,
  )}\n`,
  'utf8',
);

const total = written.reduce((sum, face) => sum + face.bytes, 0);
console.log(`fetch-fonts-native: ${written.length} ttf files, ${Math.round(total / 1024)} kB total.`);
