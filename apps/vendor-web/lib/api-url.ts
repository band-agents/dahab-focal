/**
 * Where the API is.
 *
 * `DAHAB_API_URL` when it is set — the standalone server on this machine
 * (`http://127.0.0.1:4001`), or wherever else it runs. On Vercel, unset, it
 * is this app's own production address plus `/api/rpc`, where the API is
 * mounted (app/api/rpc). The production domain, not the per-deployment URL:
 * Vercel protects deployment URLs by default, and a call to one from the
 * server would be answered with a login page.
 */
const onVercel = process.env['VERCEL_PROJECT_PRODUCTION_URL'];

export const API_URL =
  process.env['DAHAB_API_URL'] ??
  (onVercel === undefined || onVercel === '' ? 'http://127.0.0.1:4000' : `https://${onVercel}/api/rpc`);
