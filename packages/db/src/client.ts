import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema/index.ts';

/**
 * The database handle.
 *
 * `postgres-js` rather than `pg` because Drizzle's PostGIS support relies on
 * raw SQL fragments coming back untouched, and because prepared statements
 * are on by default.
 */
export type Database = PostgresJsDatabase<typeof schema>;

export interface CreateDatabaseOptions {
  readonly url?: string;
  readonly max?: number;
  /** Single connection, no prepared statements — for migrations and seeds. */
  readonly singleConnection?: boolean;
}

export function databaseUrl(explicit?: string): string {
  const url = explicit ?? process.env['DATABASE_URL'];
  if (url === undefined || url === '') {
    throw new Error(
      'DATABASE_URL is not set. Start the stack with `pnpm db:up` and copy .env.example to .env.',
    );
  }
  return url;
}

export function createDatabase(options: CreateDatabaseOptions = {}): {
  db: Database;
  close: () => Promise<void>;
} {
  const url = databaseUrl(options.url);
  /*
   * Supabase's transaction pooler (port 6543) hands each transaction to
   * whichever server connection is free, so a statement prepared on one is
   * missing on the next: prepared statements must be off there. It is the
   * pooler a serverless host should use — many short-lived instances, each
   * holding a few connections, would exhaust the session pooler's slots.
   */
  const transactionPooler = ((): boolean => {
    try {
      return new URL(url).port === '6543';
    } catch {
      // A password with characters URL parsing refuses; postgres-js copes.
      return url.includes(':6543/');
    }
  })();
  // One serverless instance serves one request at a time; a few connections
  // cover a request's parallel queries without starving the other instances.
  const defaultMax = process.env['VERCEL'] === '1' ? 3 : 10;
  const client = postgres(url, {
    max: options.singleConnection === true ? 1 : (options.max ?? defaultMax),
    prepare: options.singleConnection !== true && !transactionPooler,
    /*
     * Let go of a connection before the pooler does.
     *
     * The platform runs behind Supabase's pooler, which closes client
     * connections it considers idle — and closes all of them when the project
     * pauses and resumes. Without these, the pool keeps the dead socket and the
     * first query to pick it up fails with `write CONNECTION_CLOSED`: a sign-in
     * refused with a 500 after every quiet spell, fixed only by restarting the
     * API. That is exactly what happened on 25 Sep 2026 after a restore.
     *
     * 20 seconds idle is well inside any pooler's timeout; 30 minutes of total
     * life recycles a connection that stayed busy long enough to be killed
     * mid-stream by a pooler restart.
     */
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    // Everything is stored UTC; rendering happens in Africa/Cairo at the edge.
    types: {},
    onnotice: () => {},
  });

  return {
    db: drizzle(client, { schema, casing: 'snake_case' }),
    close: async () => {
      await client.end({ timeout: 5 });
    },
  };
}

export { schema };
