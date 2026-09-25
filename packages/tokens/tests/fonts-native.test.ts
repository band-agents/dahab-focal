import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// A plain .mjs helper, deliberately outside the build: it parses font
// binaries and nothing ships it.
import { SCRIPT_SAMPLES, coveredCodepoints } from '../scripts/font-coverage.mjs';

/**
 * The native typefaces, and the one question about them that matters.
 *
 * On the web a face with no Arabic in it is harmless: `unicode-range` means
 * the browser never reaches for it. React Native has no such mechanism. A
 * Rubik without Arabic registers without error, reports its own name
 * correctly, and renders every screen of the Arabic-first operator app as a
 * row of empty boxes — on a phone, at the dock, with nothing in the logs.
 *
 * `pnpm shoot` catches a missing face on the web. Nothing catches this, so
 * these assertions are the gate.
 */

const here = dirname(fileURLToPath(import.meta.url));
const nativeDir = resolve(here, '../fonts/native');

async function coverage(file: string): Promise<Set<number>> {
  return coveredCodepoints(await readFile(resolve(nativeDir, file))) as Set<number>;
}

const samples = SCRIPT_SAMPLES as Record<string, number>;

describe('Rubik carries all three scripts, at every weight the design uses', () => {
  /**
   * This is why the design chose one family for Latin, Cyrillic and Arabic.
   * A latin-only subset would silently break Russian and Arabic, which is
   * five of the seven locales between them.
   */
  for (const file of ['Rubik-Light.ttf', 'Rubik-Regular.ttf', 'Rubik-Medium.ttf']) {
    it(`${file} draws latin, latin-ext, cyrillic and arabic`, async () => {
      const covered = await coverage(file);
      for (const script of ['latin', 'latinExt', 'cyrillic', 'arabic', 'arabicIndicDigit']) {
        expect(covered.has(samples[script] as number), `${file} is missing ${script}`).toBe(true);
      }
    });
  }
});

describe('the two display faces cover the script each is for', () => {
  it('Baloo 2 draws Latin — it is the Latin display face', async () => {
    const covered = await coverage('Baloo2-SemiBold.ttf');
    expect(covered.has(samples['latin'] as number)).toBe(true);
    expect(covered.has(samples['latinExt'] as number)).toBe(true);
  });

  it('Baloo Bhaijaan 2 draws Arabic — it is the Arabic display face', async () => {
    const covered = await coverage('BalooBhaijaan2-SemiBold.ttf');
    expect(covered.has(samples['arabic'] as number)).toBe(true);
    expect(covered.has(samples['arabicIndicDigit'] as number)).toBe(true);
  });
});

describe('the files are what React Native can actually read', () => {
  /**
   * woff2 is what the web pipeline fetches and what React Native cannot open
   * at all. The two live in separate directories for exactly this reason, and
   * a woff2 that found its way in here would install silently and render
   * nothing.
   */
  it('every native face is TrueType or OpenType, never woff', async () => {
    for (const file of [
      'Rubik-Light.ttf',
      'Rubik-Regular.ttf',
      'Rubik-Medium.ttf',
      'Baloo2-SemiBold.ttf',
      'BalooBhaijaan2-SemiBold.ttf',
    ]) {
      const bytes = await readFile(resolve(nativeDir, file));
      const tag = bytes.subarray(0, 4).toString('latin1');
      const isTrueType = bytes.readUInt32BE(0) === 0x0001_0000 || tag === 'true' || tag === 'ttcf';
      expect(isTrueType || tag === 'OTTO', `${file} is ${tag}`).toBe(true);
    }
  });
});
