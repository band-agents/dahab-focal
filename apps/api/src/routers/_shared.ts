import { TRPCError } from '@trpc/server';

import { currencySchema } from '@dahab/api-contract';
import type { CurrencyCode } from '@dahab/i18n/server';

import type { Context } from '../context.ts';

/**
 * The two things every admin router needs and neither should redeclare.
 *
 * `requireDb` existed twice and `asCurrency` was private to admin.ts, which is
 * how the second router nearly grew its own copy of both. A currency coercion
 * that throws in one file and coerces in another is the kind of divergence
 * that shows up as a wrong symbol on a payout months later.
 */

/** A procedure that needs the database says so honestly. */
export function requireDb(ctx: Context) {
  if (ctx.db === null) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message:
        'The database is not configured. Set DATABASE_URL and run `pnpm db:migrate && pnpm db:seed`.',
    });
  }
  return ctx.db;
}

/**
 * A currency code off a money column, checked rather than cast.
 *
 * Money is an integer plus a code, and the code arrives from Postgres as a
 * bare `char(3)`. Trusting it would let a row written before the enum existed
 * reach a formatter as a currency that does not exist, which renders as the
 * raw code beside a number — a price nobody can read.
 */
export function asCurrency(value: string | null): CurrencyCode {
  const parsed = currencySchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`Unknown currency code stored on a money column: ${String(value)}`);
  }
  return parsed.data;
}

/**
 * The Cairo calendar day an instant falls on, as YYYY-MM-DD.
 *
 * Every `local_date` column holds a Cairo day, and a UTC slice does not equal
 * one: a 06:00 departure off the Masbat shore is 04:00 UTC, so a seed written
 * late in the evening files a whole week on the day before. That has already
 * happened here once. Use this, never `toISOString().slice(0, 10)`, whenever
 * a date is being compared against a `local_date`.
 */
export function cairoDay(at: Date): string {
  // `en-CA` formats as YYYY-MM-DD, which is what the `local_date` columns hold.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(at);
}
