import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * Staff passwords.
 *
 * scrypt from node's own crypto, not bcrypt or argon2 from npm: this is the
 * one place a dependency would sit directly on the credential path, and
 * scrypt is memory-hard, in the standard library, and already what
 * `AUTH_SECRET` is protected with elsewhere.
 *
 * Only console staff have a password at all. Travellers sign in with a
 * one-time code and never have one to lose — see `users.passwordHash`.
 *
 * The encoded form carries its own parameters:
 *
 *   scrypt$16384$8$1$<salt base64url>$<derived key base64url>
 *
 * so the cost can be raised later and old hashes still verify against the
 * parameters they were made with. A hash that hardcodes its cost in the
 * verifier can never be strengthened without locking everyone out.
 */

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/** Current cost. Raise N, never lower it; old hashes keep their own. */
const COST = { N: 16_384, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * scrypt needs roughly 128 · N · r bytes. Node's default maxmem is 32 MiB,
 * which the parameters above sit right at the edge of, so it is stated
 * rather than discovered as an intermittent failure under load.
 */
function maxmemFor(N: number, r: number): number {
  return Math.max(32 * 1024 * 1024, 256 * N * r);
}

/**
 * The shortest password worth storing.
 *
 * Length is the only requirement. Composition rules — a digit, a symbol, a
 * capital — measurably push people towards `Password1!` and towards reuse,
 * and NIST dropped them for that reason.
 */
export const MIN_PASSWORD_LENGTH = 12;

/**
 * `minLength` defaults to the console's rule. Operator logins pass
 * MIN_OPERATOR_PASSWORD_LENGTH instead; the floor is still enforced here, so
 * no caller can store a shorter password than the rule it names.
 */
export async function hashPassword(
  password: string,
  minLength: number = MIN_PASSWORD_LENGTH,
): Promise<string> {
  if (password.length < minLength) {
    throw new Error(`A password must be at least ${minLength} characters.`);
  }
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(password.normalize('NFKC'), salt, KEY_LENGTH, {
    ...COST,
    maxmem: maxmemFor(COST.N, COST.r),
  });
  return [
    'scrypt',
    COST.N,
    COST.r,
    COST.p,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$');
}

/**
 * Constant-time, and false rather than throwing on a malformed stored value —
 * a corrupt row must read as "wrong password", not as a 500 that tells an
 * attacker the account exists.
 */
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const saltPart = parts[4];
  const keyPart = parts[5];
  if (
    !Number.isInteger(N) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    N <= 1 ||
    r <= 0 ||
    p <= 0 ||
    saltPart === undefined ||
    keyPart === undefined
  ) {
    return false;
  }

  const expected = Buffer.from(keyPart, 'base64url');
  if (expected.length === 0) return false;

  let derived: Buffer;
  try {
    derived = await scryptAsync(
      password.normalize('NFKC'),
      Buffer.from(saltPart, 'base64url'),
      expected.length,
      { N, r, p, maxmem: maxmemFor(N, r) },
    );
  } catch {
    return false;
  }

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/**
 * Whether a stored hash was made with weaker parameters than we use now, so
 * a successful sign-in can quietly re-hash at the current cost.
 */
export function needsRehash(encoded: string): boolean {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return true;
  return Number(parts[1]) < COST.N || Number(parts[2]) < COST.r;
}

/** Sign-in lockout. Ten tries, then fifteen minutes. */
export const MAX_FAILED_SIGN_INS = 10;
export const LOCKOUT_MINUTES = 15;

/**
 * A wrong password and an unknown email must cost the same wall-clock time,
 * or the difference measures which addresses have accounts. When there is no
 * user to check, verify against this instead of returning early.
 */
export const DUMMY_HASH =
  'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$' +
  'x2hGmIaXvQZQeZbCkTXtiFpOBL3jQpBt4rYb0RmRFa7Bwo9Uj0UCSCWjaRLZg1NRvNjEkjHEWa9xnrXvJ8dZ6w';
