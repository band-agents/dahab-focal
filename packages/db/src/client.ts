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
  const client = postgres(databaseUrl(options.url), {
    max: options.singleConnection === true ? 1 : (options.max ?? 10),
    prepare: options.singleConnection !== true,
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
