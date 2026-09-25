import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

import { configProblems } from '../config.ts';
import { createFetchContext } from '../context.ts';
import { logger } from '../logger.ts';
import { appRouter } from '../routers/index.ts';

/**
 * The API as a web-standard handler: `Request` in, `Response` out.
 *
 * The same router, the same procedures, the same context as the standalone
 * server — hosted instead inside a Next.js route on Vercel, so the whole
 * platform can run on one free host with no always-on process. The operator
 * dashboard mounts it at `/api/rpc`; Sky Eye and the dashboard both call it
 * there over HTTP, exactly as they call the standalone server locally.
 *
 * Files do not come through here. A serverless request body is capped at
 * 4.5 MB, so phones upload straight to Supabase Storage with a signed link
 * and then ask the API to check and record what arrived (`vendor.startUpload`
 * and `vendor.finishUpload`).
 *
 * A function has no boot to refuse, so a configuration that would stop the
 * standalone server instead answers every request with a 503 — and says why
 * in the log, never to the caller.
 */

let checked: string[] | null = null;

export async function handleApiRequest(request: Request, endpoint: string): Promise<Response> {
  checked ??= configProblems();
  if (checked.length > 0) {
    for (const problem of checked) logger.error('refusing requests', { problem });
    return Response.json({ error: { message: 'The API is not configured.' } }, { status: 503 });
  }

  return fetchRequestHandler({
    endpoint,
    req: request,
    router: appRouter,
    createContext: ({ req, resHeaders }) => createFetchContext({ req, resHeaders }),
    onError: ({ error, path }) => {
      if (error.code === 'INTERNAL_SERVER_ERROR') {
        logger.error('rpc failed', { path, message: error.message });
      }
    },
  });
}
