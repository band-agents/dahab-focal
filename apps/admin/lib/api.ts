import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import type { TRPCClient } from '@trpc/client';

import type { AppRouter } from '@dahab/api/router';

/**
 * The console's client for the one API.
 *
 * The admin talks to `apps/api` over HTTP like every other surface will,
 * rather than importing the router and calling it in-process. That keeps the
 * boundary real: if a query is slow or a permission is wrong, the console
 * finds out the same way the traveler app would.
 *
 * Calls run in server components, so the session token travels from the
 * console's own service credentials rather than from a browser.
 */

const API_URL = process.env['DAHAB_API_URL'] ?? 'http://127.0.0.1:4000';

export const api: TRPCClient<AppRouter> = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      // The standalone adapter in apps/api serves procedures at the root, so
      // `health` is `/health` and stays a usable uptime URL. No `/trpc` prefix.
      url: API_URL,
      headers: () => {
        const token = process.env['DAHAB_ADMIN_TOKEN'];
        return token === undefined ? {} : { authorization: `Bearer ${token}` };
      },
    }),
  ],
});

/** Why a screen has no data, in terms a person can act on. */
export type DataProblem =
  | { kind: 'unreachable'; detail: string }
  | { kind: 'noDatabase'; detail: string }
  | { kind: 'forbidden'; detail: string }
  | { kind: 'unauthorized'; detail: string };

/**
 * Runs a query and returns either its rows or a reason there are none.
 *
 * A console that renders an empty table when the API is down is lying: "no
 * operators are expiring" and "we could not ask" are different facts and have
 * to look different. Everything that reads from the API goes through here.
 */
export async function load<T>(
  query: () => Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false; problem: DataProblem }> {
  try {
    return { ok: true, data: await query() };
  } catch (error) {
    return { ok: false, problem: classify(error) };
  }
}

function classify(error: unknown): DataProblem {
  if (error instanceof TRPCClientError) {
    const code = (error.data as { code?: string } | null)?.code;
    if (code === 'PRECONDITION_FAILED') {
      return { kind: 'noDatabase', detail: error.message };
    }
    if (code === 'FORBIDDEN') return { kind: 'forbidden', detail: error.message };
    if (code === 'UNAUTHORIZED') return { kind: 'unauthorized', detail: error.message };
  }
  return {
    kind: 'unreachable',
    detail: error instanceof Error ? error.message : String(error),
  };
}
