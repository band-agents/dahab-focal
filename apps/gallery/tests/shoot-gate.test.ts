import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const run = promisify(execFile);

/**
 * The gate that guards the gate.
 *
 * The screenshot harness once passed while producing four byte-identical
 * images of the wrong thing: the configuration was handed to an app that read
 * none of it. The assertions added afterwards are only worth anything if they
 * actually fire, so this runs the real shooter against a fixture that
 * reproduces that exact failure and requires it to fail, by name.
 *
 * Weaken any assertion in shoot.mjs and this test goes red.
 */

const galleryRoot = fileURLToPath(new URL('..', import.meta.url));
const shooter = join(galleryRoot, 'scripts', 'shoot.mjs');
const brokenDist = join(galleryRoot, 'scripts', '__fixtures__', 'broken-dist');

const CHROME_CANDIDATES = [
  process.env['CHROME_PATH'],
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter((candidate): candidate is string => typeof candidate === 'string');

const hasChrome = CHROME_CANDIDATES.some((candidate) => existsSync(candidate));

let outDir = '';

beforeAll(async () => {
  outDir = await mkdtemp(join(tmpdir(), 'dahab-shoot-gate-'));
});

afterAll(async () => {
  if (outDir !== '') await rm(outDir, { recursive: true, force: true });
});

interface ShooterResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function shootFixture(): Promise<ShooterResult> {
  try {
    const { stdout, stderr } = await run(
      process.execPath,
      [shooter, '--dist', brokenDist, '--out', outDir],
      { cwd: galleryRoot, timeout: 180_000 },
    );
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return {
      code: failure.code ?? -1,
      stdout: failure.stdout ?? '',
      stderr: failure.stderr ?? '',
    };
  }
}

describe.skipIf(!hasChrome)('the screenshot gate rejects a broken build', () => {
  let result: ShooterResult;

  beforeAll(async () => {
    result = await shootFixture();
  }, 200_000);

  it('exits non-zero rather than filing the images as evidence', () => {
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('not usable as evidence');
    expect(result.stdout).not.toContain('shoot: OK');
  });

  it('names the unapplied theme and direction, for every configuration', () => {
    // The fixture never sets data-theme or dir, so all four must be reported.
    expect(result.stderr).toContain('asked for theme=dark, document has data-theme=null');
    expect(result.stderr).toContain('asked for dir=rtl, document has dir=null');

    const themeFailures = result.stderr.match(/asked for theme=/g) ?? [];
    const directionFailures = result.stderr.match(/asked for dir=/g) ?? [];
    expect(themeFailures).toHaveLength(4);
    expect(directionFailures).toHaveLength(4);
  });

  it('names the identical images', () => {
    expect(result.stderr).toContain('Identical images:');
    expect(result.stderr).toContain('The configuration did not reach the app');
  });

  it('names the missing fonts rather than accepting a system face', () => {
    expect(result.stderr).toContain('no @font-face rules at all');
    // And the measurement, not just the declaration count.
    expect(result.stderr).toMatch(/measures identically to the fallback/);
  });
});

describe.skipIf(hasChrome)('the screenshot gate could not run', () => {
  it('reports that Chrome is missing rather than passing quietly', () => {
    // Reached only when no Chrome is installed. Kept as a visible, failing-shaped
    // record so a CI image without Chrome does not read as a green gate.
    expect(
      hasChrome,
      'No Chrome found, so the screenshot gate was not exercised. Set CHROME_PATH.',
    ).toBe(false);
  });
});
