import { describe, expect, it } from 'vitest';

import {
  DUMMY_HASH,
  MIN_PASSWORD_LENGTH,
  hashPassword,
  needsRehash,
  verifyPassword,
} from '../src/auth/password.ts';

/**
 * The console faces the open internet and a password is the only thing
 * between it and every booking, every payout and every incident report. What
 * is asserted here is the set of properties that, if any one broke, would not
 * show up as a failing screen — only as an account someone else is in.
 */

const PASSWORD = 'correct horse battery staple';

describe('hashing a password', () => {
  it('never stores the password itself', async () => {
    const encoded = await hashPassword(PASSWORD);
    expect(encoded).not.toContain(PASSWORD);
    expect(encoded).not.toContain('horse');
  });

  it('salts, so the same password twice gives two different hashes', async () => {
    // Without this, equal hashes across rows announce which accounts share a
    // password, and one cracked hash unlocks all of them.
    const [first, second] = await Promise.all([hashPassword(PASSWORD), hashPassword(PASSWORD)]);
    expect(first).not.toBe(second);
    expect(await verifyPassword(PASSWORD, first)).toBe(true);
    expect(await verifyPassword(PASSWORD, second)).toBe(true);
  });

  it('carries its own parameters, so the cost can be raised later', async () => {
    const encoded = await hashPassword(PASSWORD);
    const [scheme, N, r, p] = encoded.split('$');
    expect(scheme).toBe('scrypt');
    expect(Number(N)).toBeGreaterThanOrEqual(16_384);
    expect(Number(r)).toBeGreaterThan(0);
    expect(Number(p)).toBeGreaterThan(0);
  });

  it('refuses a password shorter than the minimum', async () => {
    await expect(hashPassword('a'.repeat(MIN_PASSWORD_LENGTH - 1))).rejects.toThrow();
  });
});

describe('verifying a password', () => {
  it('accepts the right one and rejects a near miss', async () => {
    const encoded = await hashPassword(PASSWORD);
    expect(await verifyPassword(PASSWORD, encoded)).toBe(true);
    expect(await verifyPassword(`${PASSWORD} `, encoded)).toBe(false);
    expect(await verifyPassword(PASSWORD.toUpperCase(), encoded)).toBe(false);
    expect(await verifyPassword('', encoded)).toBe(false);
  });

  it('normalises, so the same characters typed on two keyboards match', async () => {
    // Arabic and accented input can arrive decomposed from one IME and
    // composed from another. Without NFKC the second sign-in fails and
    // nobody can explain why.
    const composed = 'Sharm-El-Sheikh-café-2026';
    const decomposed = composed.normalize('NFD');
    expect(composed).not.toBe(decomposed);
    const encoded = await hashPassword(composed);
    expect(await verifyPassword(decomposed, encoded)).toBe(true);
  });

  it('returns false rather than throwing on a corrupt stored value', async () => {
    // A bad row must read as "wrong password". A 500 here would tell an
    // attacker the account exists and that something about it is unusual.
    for (const broken of ['', 'not-a-hash', 'scrypt$$$$', 'scrypt$0$0$0$AA$AA', 'bcrypt$1$2$3$4$5']) {
      expect(await verifyPassword(PASSWORD, broken)).toBe(false);
    }
  });

  it('does real work against the dummy hash', async () => {
    // The dummy exists so an unknown email costs the same time as a wrong
    // password. If it failed to parse, verify would return early and the
    // difference would measure which addresses have accounts.
    const parts = DUMMY_HASH.split('$');
    expect(parts).toHaveLength(6);
    expect(Buffer.from(parts[5] ?? '', 'base64url')).toHaveLength(64);
    expect(await verifyPassword(PASSWORD, DUMMY_HASH)).toBe(false);
  });
});

describe('needsRehash', () => {
  it('leaves a current hash alone', async () => {
    expect(needsRehash(await hashPassword(PASSWORD))).toBe(false);
  });

  it('flags a weaker one, and anything it cannot read', () => {
    expect(needsRehash('scrypt$1024$8$1$AA$AA')).toBe(true);
    expect(needsRehash('bcrypt$whatever')).toBe(true);
  });
});
