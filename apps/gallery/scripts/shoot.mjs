/* eslint-env node */
/**
 * Serve dist/ and screenshot the gallery in each required configuration.
 *
 *   node scripts/shoot.mjs
 *
 * Configuration reaches the app as URL query parameters (?theme=&dir=&locale=),
 * which apps/gallery/src/config.ts reads at module scope.
 *
 * Chrome is driven over the DevTools Protocol rather than with `--screenshot`
 * and `--window-size`. Those flags do not give a predictable CSS viewport:
 * on a display with OS scaling they produce an image whose pixel width and the
 * page's layout width disagree — 430 requested, 504 laid out — so the right
 * edge of every screenshot is silently cropped. `Emulation.setDeviceMetricsOverride`
 * is exact and ignores the host's display scaling.
 *
 * No dependency: Node has had a global WebSocket since 22.4.
 *
 * Four things are asserted before an image counts as evidence:
 *   1. the page actually applied the requested theme and direction
 *   2. the bundled faces downloaded AND are being drawn with, measured rather
 *      than asked — document.fonts.check() answers true for a family that will
 *      fall back, which is how a whole set can render in system-ui and pass
 *   3. the capture is exactly viewport x deviceScaleFactor, so nothing is cropped
 *   4. the four images differ from one another
 *
 * That last check is the one this script was missing. The parameters used to
 * be passed to an app that read none of them, so all four files were the same
 * light-LTR-English render saved under four names, and the screenshot gate in
 * CLAUDE.md's working agreement could only ever pass.
 *
 * `--dist <dir>` and `--out <dir>` override the defaults. tests/shoot-gate.test.ts
 * uses them to run the whole gate against a deliberately broken fixture and
 * assert it fails — a verification gate nobody verifies is the same bug again.
 */
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));

/**
 * `--dist <dir>` and `--out <dir>` override the defaults. tests/shoot-gate.test.ts
 * points them at a deliberately broken fixture and asserts the gate fails — a
 * verification gate nobody verifies is the same bug this script was written to
 * remove.
 */
function flag(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  const value = index === -1 ? undefined : process.argv[index + 1];
  return value === undefined ? fallback : resolve(value);
}

const distDir = flag('dist', resolve(here, '..', 'dist'));
const outDir = flag('out', resolve(here, '..', 'screenshots'));

/** iPhone 15 Pro width; 2x so type is legible when a designer zooms in. */
const VIEWPORT_WIDTH = 430;
const DEVICE_SCALE_FACTOR = 2;

/**
 * `fonts` is the list of families that must have actually downloaded and be
 * in use for that configuration — not merely declared. Rubik carries every
 * script, so it is required everywhere; the display face changes with the
 * script, which is the rule ThemeProvider applies.
 */
const SHOTS = [
  {
    name: 'gallery-light-ltr-en',
    theme: 'light',
    dir: 'ltr',
    locale: 'en-GB',
    fonts: ['Rubik', 'Baloo 2'],
  },
  {
    name: 'gallery-dark-ltr-en',
    theme: 'dark',
    dir: 'ltr',
    locale: 'en-GB',
    fonts: ['Rubik', 'Baloo 2'],
  },
  {
    name: 'gallery-light-rtl-ar',
    theme: 'light',
    dir: 'rtl',
    locale: 'ar-EG',
    fonts: ['Rubik', 'Baloo Bhaijaan 2'],
  },
  {
    name: 'gallery-light-ltr-de',
    theme: 'light',
    dir: 'ltr',
    locale: 'de-DE',
    fonts: ['Rubik', 'Baloo 2'],
  },
];

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean);

const chromePath = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
if (!chromePath) {
  console.error('No Chrome found. Set CHROME_PATH.');
  process.exit(1);
}
if (!existsSync(distDir)) {
  console.error('dist/ not found. Run: pnpm --filter @dahab/gallery build');
  process.exit(1);
}

// --- static server --------------------------------------------------------

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    if (path === '/' || !extname(path)) path = '/index.html';
    const filePath = join(distDir, path);
    if (!filePath.startsWith(distDir)) {
      res.writeHead(403).end();
      return;
    }
    const body = await readFile(filePath);
    res.writeHead(200, { 'content-type': MIME[extname(filePath)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    try {
      const body = await readFile(join(distDir, 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  }
});

const port = await new Promise((done) => {
  server.listen(0, '127.0.0.1', () => done(server.address().port));
});
console.log(`serving dist/ on http://127.0.0.1:${port}`);

// --- Chrome over CDP ------------------------------------------------------

await mkdir(outDir, { recursive: true });

const userDataDir = await mkdtemp(join(tmpdir(), 'dahab-shoot-'));

const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** Chrome writes the port it actually bound to into DevToolsActivePort. */
async function devToolsPort() {
  const portFile = join(userDataDir, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (existsSync(portFile)) {
      const [line] = readFileSync(portFile, 'utf8').split('\n');
      if (line && line.trim().length > 0) return Number(line.trim());
    }
    await sleep(100);
  }
  throw new Error('Chrome never reported a DevTools port.');
}

const cdpPort = await devToolsPort();
const targets = await fetch(`http://127.0.0.1:${cdpPort}/json/list`).then((r) => r.json());
const page = targets.find((target) => target.type === 'page');
if (page === undefined) throw new Error('Chrome exposed no page target.');

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((done, fail) => {
  socket.addEventListener('open', done, { once: true });
  socket.addEventListener('error', fail, { once: true });
});

let nextId = 0;
const pending = new Map();

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id === undefined) return;
  const waiting = pending.get(message.id);
  if (waiting === undefined) return;
  pending.delete(message.id);
  if (message.error) waiting.fail(new Error(`${message.error.message} (${waiting.method})`));
  else waiting.done(message.result);
});

function send(method, params = {}) {
  const id = (nextId += 1);
  return new Promise((done, fail) => {
    pending.set(id, { done, fail, method });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

/** Evaluate in the page and return the value, failing loudly on an exception. */
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? 'evaluate threw');
  }
  return result.result.value;
}

async function setViewport(height) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: VIEWPORT_WIDTH,
    height,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    mobile: true,
  });
}

await send('Page.enable');
await send('Runtime.enable');

// --- capture --------------------------------------------------------------

const problems = [];
const digests = new Map();

for (const shot of SHOTS) {
  const target = `http://127.0.0.1:${port}/?theme=${shot.theme}&dir=${shot.dir}&locale=${shot.locale}`;

  await setViewport(932);
  await send('Page.navigate', { url: target });

  // Wait for React to have rendered something, not merely for load.
  let rendered = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const ready = await evaluate(
      `document.readyState === 'complete' && !!document.getElementById('root')?.firstElementChild`,
    ).catch(() => false);
    if (ready === true) {
      rendered = true;
      break;
    }
    // eslint-disable-next-line no-await-in-loop
    await sleep(100);
  }
  if (!rendered) {
    problems.push(`${shot.name}: the app never rendered.`);
    continue;
  }
  // One more frame for effects (the theme is stamped in a layout effect).
  await sleep(250);

  // Assertion 1: the page applied what was asked for. Without this, a config
  // that silently fails to reach the app produces a plausible-looking image.
  const applied = await evaluate(`(() => {
    const root = document.documentElement;
    const body = document.body.innerText.replace(/\\s+/g, ' ').trim();
    return {
      theme: root.getAttribute('data-theme'),
      dir: root.getAttribute('dir'),
      lang: body.slice(0, 60),
      background: getComputedStyle(document.body).backgroundColor,
    };
  })()`);

  if (applied.theme !== shot.theme) {
    problems.push(
      `${shot.name}: asked for theme=${shot.theme}, document has data-theme=${applied.theme}.`,
    );
  }
  if (applied.dir !== shot.dir) {
    problems.push(`${shot.name}: asked for dir=${shot.dir}, document has dir=${applied.dir}.`);
  }

  // Assertion 4: the bundled faces actually downloaded and are actually being
  // drawn with. `document.fonts.check()` is not enough — it answers true for a
  // family that will fall back, which is how a whole set of screenshots can be
  // rendered in system-ui and still look like a pass.
  const fontReport = await evaluate(`(async () => {
    await document.fonts.ready;
    const faces = [...document.fonts];

    // Draw the same string in the target family and in a sentinel that the
    // family must not resemble. Identical widths mean the family fell back.
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const measure = (family, sample) => {
      context.font = '600 40px ' + family;
      return context.measureText(sample).width;
    };

    return {
      declared: document.fonts.size,
      loaded: faces
        .filter((face) => face.status === 'loaded')
        .map((face) => face.family),
      resolves: ${JSON.stringify(shot.fonts)}.map((family) => {
        const sample = family === 'Baloo Bhaijaan 2' ? 'الغطس في دهب' : 'Dahab Focal 1450';
        const target = measure('"' + family + '", monospace', sample);
        const fallback = measure('monospace', sample);
        return { family, target, fallback, differs: Math.abs(target - fallback) > 0.5 };
      }),
    };
  })()`);

  if (fontReport.declared === 0) {
    problems.push(
      `${shot.name}: no @font-face rules at all (document.fonts.size is 0). ` +
        'The bundled woff2 files are not reaching the page — check that ' +
        'scripts/copy-fonts.mjs ran and that global.css imports @dahab/tokens fonts.css.',
    );
  }
  for (const family of shot.fonts) {
    if (!fontReport.loaded.includes(family)) {
      problems.push(
        `${shot.name}: "${family}" never loaded (no FontFace reached status "loaded"). ` +
          `Loaded families: ${[...new Set(fontReport.loaded)].join(', ') || 'none'}.`,
      );
    }
  }
  for (const entry of fontReport.resolves) {
    if (!entry.differs) {
      problems.push(
        `${shot.name}: "${entry.family}" measures identically to the fallback ` +
          `(${entry.target}px), so this screenshot is rendering in a system face, not the ` +
          'bundled one.',
      );
    }
  }

  // Capture the whole scrollable column rather than one screen of it.
  const contentHeight = await evaluate(
    `Math.min(6000, Math.ceil(Math.max(
       document.documentElement.scrollHeight,
       ...[...document.querySelectorAll('div')].map((el) => el.scrollHeight),
     )) + 24)`,
  );
  await setViewport(contentHeight);
  await sleep(150);

  const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const bytes = Buffer.from(data, 'base64');
  const out = join(outDir, `${shot.name}.png`);
  await writeFile(out, bytes);

  // Assertion 2: the image is exactly the emulated viewport. A mismatch is the
  // cropping bug this rewrite exists to remove.
  const pngWidth = bytes.readUInt32BE(16);
  const pngHeight = bytes.readUInt32BE(20);
  const expectedWidth = VIEWPORT_WIDTH * DEVICE_SCALE_FACTOR;
  if (pngWidth !== expectedWidth) {
    problems.push(
      `${shot.name}: image is ${pngWidth}px wide, expected ${expectedWidth} ` +
        `(${VIEWPORT_WIDTH} CSS px x ${DEVICE_SCALE_FACTOR}). The layout width and the ` +
        'capture width disagree, so the right edge is cropped.',
    );
  }

  const digest = createHash('sha256').update(bytes).digest('hex');
  const seen = digests.get(digest);
  digests.set(digest, seen === undefined ? [shot.name] : [...seen, shot.name]);

  console.log(
    `  ${shot.name}.png — ${pngWidth}x${pngHeight}, ` +
      `theme=${applied.theme} dir=${applied.dir} fonts=${[...new Set(fontReport.loaded)].join('+') || 'NONE'}`,
  );
}

// Assertion 3: four identical images are not evidence of anything.
for (const names of digests.values()) {
  if (names.length > 1) {
    problems.push(
      `Identical images: ${names.join(' = ')}. The configuration did not reach the app — ` +
        'check apps/gallery/src/config.ts and that ThemeProvider and I18nextProvider are ' +
        'mounted in app/_layout.tsx.',
    );
  }
}

// --- teardown -------------------------------------------------------------

socket.close();
chrome.kill();
server.close();
await rm(userDataDir, { recursive: true, force: true }).catch(() => {});

if (problems.length > 0) {
  console.error('\nshoot: the screenshots are not usable as evidence:\n');
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(`\nshoot: OK — ${SHOTS.length} screenshots, all distinct, none cropped.`);
