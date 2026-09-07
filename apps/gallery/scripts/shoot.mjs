/* eslint-env node */
/**
 * Serve dist/ and screenshot the gallery in each required configuration with
 * headless Chrome. No Puppeteer — the system Chrome is enough.
 *
 *   node scripts/shoot.mjs
 *
 * Config is passed to the app as URL query params (?theme=&dir=&locale=),
 * which the gallery's providers read. Output goes to apps/gallery/screenshots/.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const here = fileURLToPath(new URL('.', import.meta.url));
const distDir = resolve(here, '..', 'dist');
const outDir = resolve(here, '..', 'screenshots');

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.CHROME_PATH,
].filter(Boolean);
const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error('No Chrome found. Set CHROME_PATH.');
  process.exit(1);
}
if (!existsSync(distDir)) {
  console.error('dist/ not found. Run: pnpm --filter @dahab/gallery build');
  process.exit(1);
}

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
    // SPA fallback.
    try {
      const body = await readFile(join(distDir, 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  }
});

const SHOTS = [
  { name: 'gallery-light-ltr-en', theme: 'light', dir: 'ltr', locale: 'en-GB' },
  { name: 'gallery-dark-ltr-en', theme: 'dark', dir: 'ltr', locale: 'en-GB' },
  { name: 'gallery-light-rtl-ar', theme: 'light', dir: 'rtl', locale: 'ar-EG' },
  { name: 'gallery-light-ltr-de', theme: 'light', dir: 'ltr', locale: 'de-DE' },
];

const port = await new Promise((res) => {
  server.listen(0, '127.0.0.1', () => res(server.address().port));
});
console.log(`serving dist/ on http://127.0.0.1:${port}`);

for (const shot of SHOTS) {
  const target =
    `http://127.0.0.1:${port}/?theme=${shot.theme}&dir=${shot.dir}&locale=${shot.locale}`;
  const out = join(outDir, `${shot.name}.png`);
  await run(chrome, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=2',
    '--window-size=430,2400',
    '--default-background-color=00000000',
    `--screenshot=${out}`,
    '--virtual-time-budget=8000',
    target,
  ]).catch((error) => {
    console.error(`  ${shot.name}: chrome exited non-zero`, error.stderr ?? error.message);
  });
  console.log(`  wrote ${shot.name}.png`);
}

server.close();
