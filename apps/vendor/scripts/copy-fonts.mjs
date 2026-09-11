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
