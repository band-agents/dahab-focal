import { cache } from 'react';

import { api, load, type DataProblem } from './api';

/**
 * Who is looking at this page.
 *
 * Wrapped in React's `cache`, so the console layout's check and the shell's
 * "signed in as" read the same answer from one round trip per render. Without
 * it every screen would ask the API twice for the same fact.
 */
export interface Viewer {
  readonly userId: string | null;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  /** Null on a phone-only account, which is the normal shape for a traveller. */
  readonly email: string | null;
}

export const viewer = cache(
  async (): Promise<{ ok: true; viewer: Viewer } | { ok: false; problem: DataProblem }> => {
    const result = await load(() => api.auth.session.query());
    if (!result.ok) return result;
    return {
      ok: true,
      viewer: {
        userId: result.data.session.userId,
        roles: result.data.session.roles,
        permissions: result.data.permissions,
        // Normalised to null rather than passed through. An API one deploy
        // behind omits the field entirely, and `undefined` slips past a
        // `=== null` guard and reaches isolate() as a non-string — which is
        // exactly how this blew up the first time.
        email: result.data.email ?? null,
      },
    };
  },
);

/**
 * Whether the operator may do something, asked the same way the API asks it.
 *
 * The console hides what it would refuse — a button that 403s is a worse
 * answer than one that is not there. The API still checks; this only decides
 * what to draw, and the two read the same permission names.
 */
export function allows(subject: Viewer | null, permission: string): boolean {
  return subject !== null && subject.permissions.includes(permission);
}
