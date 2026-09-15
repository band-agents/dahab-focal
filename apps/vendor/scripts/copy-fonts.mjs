/* eslint-env node */
/**
 * Copy the self-hosted woff2 files from @dahab/tokens into public/, which
 * Expo serves at the web root. The generated fonts.css references them as
 * /fonts/<file>, so any web surface consuming @dahab/tokens/fonts.css has to
 * do this — the alternative is a bundler-specific url() rewrite in four places.
 */
import { cp, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const from = fileURLToPath(new URL('../../../packages/tokens/fonts', import.meta.url));
const to = fileURLToPath(new URL('../public/fonts', import.meta.url));

await mkdir(to, { recursive: true });
const files = (await readdir(from)).filter((name) => name.endsWith('.woff2'));
if (files.length === 0) {
  console.error('No woff2 files in packages/tokens/fonts. Run: pnpm --filter @dahab/tokens fonts');
  process.exit(1);
}
for (const file of files) {
  await cp(join(from, file), join(to, file));
}
console.log(`copy-fonts: ${files.length} woff2 files into public/fonts/`);

/**
 * The same faces again, as TTF, for React Native.
 *
 * Copied into the app rather than referenced where they live, because
 * `app.config.js` hands these paths to expo-font's config plugin and a
 * prebuild resolves them against the app directory — a path reaching up into
 * the workspace works when Metro serves it and fails when a native project is
 * generated, which is the worst place to find out.
 *
 * woff2 above is for the web and cannot be read by React Native at all; ttf
 * here is for the phone and is what `packages/tokens/tests/fonts-native.test.ts`
 * checks the script coverage of.
 */
const nativeFrom = fileURLToPath(new URL('../../../packages/tokens/fonts/native', import.meta.url));
const nativeTo = fileURLToPath(new URL('../assets/fonts', import.meta.url));

await mkdir(nativeTo, { recursive: true });
const ttf = (await readdir(nativeFrom)).filter((name) => name.endsWith('.ttf'));
if (ttf.length === 0) {
  console.error(
    'No ttf files in packages/tokens/fonts/native. Run: node packages/tokens/scripts/fetch-fonts-native.mjs',
  );
  process.exit(1);
}
for (const file of ttf) {
  await cp(join(nativeFrom, file), join(nativeTo, file));
}
console.log(`copy-fonts: ${ttf.length} ttf files into assets/fonts/`);
