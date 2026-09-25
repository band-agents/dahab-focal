import { handleApiRequest } from '@dahab/api/fetch';

/**
 * The platform's API, hosted inside this app.
 *
 * On Vercel there is no always-on server for the API, so it runs here as a
 * function at `/api/rpc` — the same router the standalone server runs
 * locally. Sky Eye and this dashboard both call it over HTTP at that address
 * (see lib/api-url.ts). Node runtime: it talks to Postgres.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ENDPOINT = '/api/rpc';

function handle(request: Request): Promise<Response> {
  return handleApiRequest(request, ENDPOINT);
}

export { handle as GET, handle as POST };
