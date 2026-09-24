import { and, count, desc, eq, gt, isNull } from 'drizzle-orm';

import { schema } from '@dahab/db';
import type { Database } from '@dahab/db';

import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_SECONDS,
  hashOtp,
  verifyOtp,
} from './otp.ts';

/**
 * One-time codes, persisted.
 *
 * `phoneStart` used to generate a code, send it, and forget it, and
 * `phoneVerify` threw NOT_IMPLEMENTED — so signing in by phone was a door
 * drawn on a wall. It mattered the day operators got a dashboard: a dive
 * centre adds its guides by phone number, and a guide has no password to
 * forget because they are never given one. This is what makes that true.
 *
 * The rules, and why each exists:
 *
 *   - **Only a hash is stored.** A leaked `otp_challenges` table must not be a
 *     list of working codes.
 *   - **Five attempts per code.** Six digits is a million guesses; five is
 *     one in two hundred thousand, and the code is dead after that.
 *   - **A minute between sends.** Somebody tapping "send again" three times
 *     should get one text, not three that cost money and arrive out of order.
 *   - **Five codes an hour per number.** Keyed on the destination, not the IP:
 *     a hostel's shared connection is one IP and forty travellers, and an
 *     attacker rotates IPs for free.
 *   - **A code works once.** Consumed on success, so a code read over
 *     somebody's shoulder after they used it opens nothing.
 */

const HOURLY_LIMIT = 5;

export type StartOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'cooldown' | 'hourlyLimit'; readonly retryAfterSeconds: number };

export async function startChallenge(
  db: Database,
  destination: string,
  code: string,
  now: Date,
): Promise<StartOutcome> {
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [latest] = await db
    .select({ createdAt: schema.otpChallenges.createdAt })
    .from(schema.otpChallenges)
    .where(eq(schema.otpChallenges.destination, destination))
    .orderBy(desc(schema.otpChallenges.createdAt))
    .limit(1);

  if (latest !== undefined) {
    const sinceSeconds = (now.getTime() - latest.createdAt.getTime()) / 1000;
    if (sinceSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
      return {
        ok: false,
        reason: 'cooldown',
        retryAfterSeconds: Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - sinceSeconds),
      };
    }
  }

  const [recent] = await db
    .select({ total: count() })
    .from(schema.otpChallenges)
    .where(
      and(
        eq(schema.otpChallenges.destination, destination),
        gt(schema.otpChallenges.createdAt, hourAgo),
      ),
    );
  if (Number(recent?.total ?? 0) >= HOURLY_LIMIT) {
    return { ok: false, reason: 'hourlyLimit', retryAfterSeconds: 60 * 60 };
  }

  await db.insert(schema.otpChallenges).values({
    destination,
    codeHash: hashOtp(code, destination),
    attempts: { count: 0, lastAt: now.toISOString() },
    expiresAt: new Date(now.getTime() + OTP_TTL_SECONDS * 1000),
    createdAt: now,
    updatedAt: now,
  });
  return { ok: true };
}

export type VerifyOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'noChallenge' | 'tooManyAttempts' | 'wrongCode' };

/**
 * Checks a code against the newest live challenge for the destination.
 *
 * The attempt is counted BEFORE the comparison, and in the same statement
 * that reads the counter. Counting after would let a burst of parallel
 * guesses all read "4 attempts" and all be compared — the limit has to hold
 * under concurrency, not only one request at a time.
 */
export async function verifyChallenge(
  db: Database,
  destination: string,
  code: string,
  now: Date,
): Promise<VerifyOutcome> {
  return db.transaction(async (tx) => {
    const [challenge] = await tx
      .select({
        id: schema.otpChallenges.id,
        codeHash: schema.otpChallenges.codeHash,
        attempts: schema.otpChallenges.attempts,
      })
      .from(schema.otpChallenges)
      .where(
        and(
          eq(schema.otpChallenges.destination, destination),
          isNull(schema.otpChallenges.consumedAt),
          gt(schema.otpChallenges.expiresAt, now),
        ),
      )
      .orderBy(desc(schema.otpChallenges.createdAt))
      .limit(1)
      // Locks the row for this transaction, so a parallel guess waits for
      // this one's increment instead of reading the same count.
      .for('update');

    if (challenge === undefined) return { ok: false, reason: 'noChallenge' };
    if (challenge.attempts.count >= OTP_MAX_ATTEMPTS) {
      return { ok: false, reason: 'tooManyAttempts' };
    }

    await tx
      .update(schema.otpChallenges)
      .set({
        attempts: { count: challenge.attempts.count + 1, lastAt: now.toISOString() },
        updatedAt: now,
      })
      .where(eq(schema.otpChallenges.id, challenge.id));

    if (!verifyOtp(code, destination, challenge.codeHash)) {
      return { ok: false, reason: 'wrongCode' };
    }

    await tx
      .update(schema.otpChallenges)
      .set({ consumedAt: now, updatedAt: now })
      .where(eq(schema.otpChallenges.id, challenge.id));
    return { ok: true };
  });
}
