/**
 * The admin console.
 *
 * Workspace packages ship as TypeScript source rather than build output, so
 * Next has to transpile them the way the Expo surfaces do through Metro.
 */
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
  experimental: {
    typedRoutes: true,
  },
};
