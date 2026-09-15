import { fileURLToPath } from 'node:url';

/**
 * The admin console.
 *
 * Workspace packages ship as TypeScript source rather than build output, so
 * Next has to transpile them the way the Expo surfaces do through Metro.
 */

/**
 * Next reads `.env` from the app directory, but this repo keeps one `.env` at
 * the workspace root — that is what `.env.example` documents, and splitting
 * DATABASE_URL from DAHAB_ADMIN_TOKEN across two files is how they drift.
 * Absent (Vercel, CI) this is a no-op and the platform's own variables win.
 */
try {
  process.loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)));
} catch {
  // No root .env: every variable comes from the environment already.
}

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  transpilePackages: [
    '@dahab/ui-web',
    '@dahab/i18n',
    '@dahab/tokens',
    '@dahab/api-contract',
    '@dahab/api',
    '@dahab/db',
  ],
  async redirects() {
    return [{ source: '/', destination: '/en-GB', permanent: false }];
  },
  typedRoutes: true,
};
