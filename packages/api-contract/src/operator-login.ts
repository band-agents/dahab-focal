import { z } from 'zod';

/**
 * How an operator — a dive centre's owner or one of its team — signs in with
 * a name and a password.
 *
 * Separate from the console's rules in `auth.ts` on purpose. Console staff
 * face the whole platform and keep a 12-character minimum; an operator's
 * login reaches one centre, is usually made for them by Sky Eye or by their
 * owner, and has to be something a guide can type on a boat. Eight
 * characters, no composition rules, and a lockout after repeated failures
 * (the same counter the console uses) is the trade.
 */
export const MIN_OPERATOR_PASSWORD_LENGTH = 8;

/**
 * A username: 3–40 characters, lowercase letters, digits, dots, dashes and
 * underscores, starting with a letter or digit. Lowercased before checking,
 * so `Jelly.Owner` and `jelly.owner` are one name, and an `@` can never
 * appear — which is how a sign-in box tells a username from an email.
 */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9._-]{2,39}$/, 'Use 3–40 letters, digits, dots, dashes or underscores.');

export const operatorPasswordSchema = z.string().min(MIN_OPERATOR_PASSWORD_LENGTH).max(512);

/** One box that takes either a username or an email, and a password. */
export const identifierSignInSchema = z
  .object({
    identifier: z.string().trim().min(1).max(320),
    /** Never logged, never echoed back, never put in a URL. */
    password: z.string().min(1).max(512),
  })
  .strict();
