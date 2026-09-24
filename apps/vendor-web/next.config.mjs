import { fileURLToPath } from 'node:url';

/**
 * The operator dashboard — the web version, for now.
 *
 * A phone app will come later as its own Flutter build; this one is the web
 * dashboard a dive centre opens on a laptop at the shop or on a phone on the
 * boat, and it is built for the second of those first.
 */

// One `.env` at the workspace root, as for every other surface.
try {
  process.loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)));
} catch {
  // No root .env: every variable comes from the environment already.
}

const API_URL = process.env['DAHAB_API_URL'] ?? 'http://127.0.0.1:4000';

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  transpilePackages: ['@dahab/i18n', '@dahab/tokens', '@dahab/api-contract', '@dahab/api', '@dahab/db'],
  async redirects() {
    // Arabic first. The people running a dive centre in Dahab work in Arabic;
    // the other six languages are one tap away in the account menu.
    return [{ source: '/', destination: '/ar-EG', permanent: false }];
  },
  /*
   * Uploaded pictures and videos are served by the API at `/media/<key>`, and
   * the store hands back exactly that root-relative path. Rewriting it here
   * means a photo loads from this app's own origin — no cross-origin rules to
   * get right, and the same path keeps working when the API moves host. Byte
   * ranges pass through, so videos still seek.
   */
  async rewrites() {
    return [{ source: '/media/:path*', destination: `${API_URL}/media/:path*` }];
  },
  typedRoutes: true,
};
