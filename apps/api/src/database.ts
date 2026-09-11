import { createDatabase, type Database } from '@dahab/db';

import { logger } from './logger.ts';

/**
 * The process-wide database handle.
 *
 * Created lazily on first use rather than at import, so the server still
 * starts — and `health` still answers — when DATABASE_URL is absent. A boot
 * that dies on a missing connection string tells you nothing; a health check
 * that says `unavailable` tells you exactly what is wrong.
 *
 * The pool is a singleton because postgres-js manages its own connections;
 * creating one per request would exhaust the server long before the database.
 */

let handle: { db: Database; close: () => Promise<void> } | null = null;
let failure: string | null = null;

export function getDatabase(): Database | null {
  if (handle !== null) return handle.db;
  if (failure !== null) return null;

  try {
    handle = createDatabase();
    return handle.db;
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
    logger.warn('database unavailable', { reason: failure });
    return null;
  }
}

/** For the health check: reachable, absent, or not yet asked. */
export async function probeDatabase(): Promise<'ok' | 'unavailable'> {
  const db = getDatabase();
  if (db === null) return 'unavailable';
  try {
    // Cheapest possible round trip that proves the socket and the auth.
    await db.execute('select 1');
    return 'ok';
  } catch (error) {
    logger.warn('database probe failed', {
      reason: error instanceof Error ? error.message : String(error),
    });
    return 'unavailable';
  }
}

export async function closeDatabase(): Promise<void> {
  if (handle === null) return;
  await handle.close();
  handle = null;
}
