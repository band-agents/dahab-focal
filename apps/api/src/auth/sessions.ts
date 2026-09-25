import { and, eq, gt, isNull } from 'drizzle-orm';

import type { Role } from '@dahab/api-contract';
import type { Database } from '@dahab/db';
import { schema } from '@dahab/db';
import type { Locale } from '@dahab/i18n/server';

import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_DAYS,
  hashRefreshToken,
  issueAccessToken,
  issueRefreshToken,
} from './tokens.ts';

/**
 * Sessions that outlive the process.
 *
 * The access token is stateless and short-lived; the refresh token is opaque,
 * stored only as a hash, and rotated on every use. That split is what makes
 * "sign this device out" a row update rather than a key rotation that would
 * sign everyone out at once.
 *
 * A guest session is deliberately not persisted: `sessions.user_id` is NOT
 * NULL, and a guest has no user row to point at until they claim one.
 */

const DAY_MS = 86_400_000;

export interface IssuedCredentials {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresInSeconds: number;
  readonly session: {
    readonly id: string;
    readonly userId: string;
    /**
     * A plain array, not readonly: this crosses the wire, and the zod output
     * schema the procedure validates against describes mutable arrays.
     */
    readonly roles: Role[];
    readonly vendorId: string | null;
    readonly isGuest: false;
    readonly expiresAt: Date;
  };
}

/**
 * Every role the user holds, and the vendor they act for if exactly one.
 *
 * Two vendor roles on one account is a real shape — someone who owns a centre
 * and helps out at another — and picking one arbitrarily would silently show
 * them the wrong vendor's bookings. Until the UI can ask, it acts for none.
 */
export async function rolesFor(
  db: Database,
  userId: string,
): Promise<{ roles: readonly Role[]; vendorId: string | null }> {
  const rows = await db
    .select({ role: schema.userRoles.role, vendorId: schema.userRoles.vendorId })
    .from(schema.userRoles)
    .where(eq(schema.userRoles.userId, userId));

  const roles = [...new Set(rows.map((row) => row.role))] as Role[];
  const vendorIds = [...new Set(rows.map((row) => row.vendorId).filter((id) => id !== null))];

  return {
    roles: roles.length > 0 ? roles : (['traveler'] as const),
    vendorId: vendorIds.length === 1 ? (vendorIds[0] as string) : null,
  };
}

export async function createSession(
  db: Database,
  input: {
    userId: string;
    roles: readonly Role[];
    vendorId: string | null;
    locale: Locale;
    deviceId?: string | undefined;
    userAgent?: string | undefined;
  },
  now = new Date(),
): Promise<IssuedCredentials> {
  const refresh = issueRefreshToken();
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_DAYS * DAY_MS);

  const [row] = await db
    .insert(schema.sessions)
    .values({
      userId: input.userId,
      deviceId: input.deviceId ?? null,
      userAgent: input.userAgent ?? null,
      refreshTokenHash: refresh.hash,
      expiresAt,
      lastSeenAt: now,
    })
    .returning({ id: schema.sessions.id });

  if (row === undefined) {
    throw new Error('The session row was not written.');
  }

  // The session id in the token is the row's id, so revoking the row and
  // recognising the token are the same fact rather than two that can drift.
  const accessToken = issueAccessToken({
    sessionId: row.id,
    userId: input.userId,
    roles: input.roles,
    vendorId: input.vendorId,
    isGuest: false,
    locale: input.locale,
  });

  return {
    accessToken,
    refreshToken: refresh.token,
    expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
    session: {
      id: row.id,
      userId: input.userId,
      roles: [...input.roles],
      vendorId: input.vendorId,
      isGuest: false,
      expiresAt: new Date(now.getTime() + ACCESS_TOKEN_TTL_SECONDS * 1000),
    },
  };
}

export type RefreshOutcome =
  | { ok: true; credentials: IssuedCredentials }
  | { ok: false; reason: 'unknown' | 'revoked' | 'expired' };

/**
 * Rotates the refresh token: the presented one stops working the moment a new
 * one is issued. A refresh token that survives its own use is a refresh token
 * that can be replayed from a stolen backup.
 */
export async function refreshSession(
  db: Database,
  refreshToken: string,
  now = new Date(),
): Promise<RefreshOutcome> {
  const presented = hashRefreshToken(refreshToken);

  const [existing] = await db
    .select({
      id: schema.sessions.id,
      userId: schema.sessions.userId,
      deviceId: schema.sessions.deviceId,
      userAgent: schema.sessions.userAgent,
      expiresAt: schema.sessions.expiresAt,
      revokedAt: schema.sessions.revokedAt,
    })
    .from(schema.sessions)
    .where(eq(schema.sessions.refreshTokenHash, presented))
    .limit(1);

  if (existing === undefined) return { ok: false, reason: 'unknown' };
  if (existing.revokedAt !== null) return { ok: false, reason: 'revoked' };
  if (existing.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: 'expired' };

  const rotated = issueRefreshToken();
  const [preferences] = await db
    .select({ locale: schema.userPreferences.locale })
    .from(schema.userPreferences)
    .where(eq(schema.userPreferences.userId, existing.userId))
    .limit(1);

  const { roles, vendorId } = await rolesFor(db, existing.userId);

  await db
    .update(schema.sessions)
    .set({
      refreshTokenHash: rotated.hash,
      expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_DAYS * DAY_MS),
      lastSeenAt: now,
      updatedAt: now,
    })
    .where(eq(schema.sessions.id, existing.id));

  const locale = (preferences?.locale ?? 'en-GB') as Locale;

  return {
    ok: true,
    credentials: {
      accessToken: issueAccessToken({
        sessionId: existing.id,
        userId: existing.userId,
        roles,
        vendorId,
        isGuest: false,
        locale,
      }),
      refreshToken: rotated.token,
      expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
      session: {
        id: existing.id,
        userId: existing.userId,
        roles: [...roles],
        vendorId,
        isGuest: false,
        expiresAt: new Date(now.getTime() + ACCESS_TOKEN_TTL_SECONDS * 1000),
      },
    },
  };
}

/**
 * Revokes one session. The access token stays valid until it expires, which
 * is why its TTL is fifteen minutes and not a day.
 */
export async function revokeSession(
  db: Database,
  sessionId: string,
  now = new Date(),
): Promise<void> {
  await db
    .update(schema.sessions)
    .set({ revokedAt: now, updatedAt: now })
    .where(and(eq(schema.sessions.id, sessionId), isNull(schema.sessions.revokedAt)));
}

/**
 * Whether the session behind an access token is still live.
 *
 * The token verifies on its signature alone, which is what makes it cheap;
 * this is the check that makes revocation real, and it is why the console
 * calls it on the routes that matter rather than trusting the signature.
 */
export async function isSessionLive(
  db: Database,
  sessionId: string,
  now = new Date(),
): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.sessions.id })
    .from(schema.sessions)
    .where(
      and(
        eq(schema.sessions.id, sessionId),
        isNull(schema.sessions.revokedAt),
        // `gt`, not a raw sql template: drizzle knows this column is a
        // timestamptz and binds the Date as a parameter. Interpolated into
        // raw sql it reaches the driver as a JS object and postgres-js
        // rejects it — which surfaced as a 500 on every signed-in request.
        gt(schema.sessions.expiresAt, now),
      ),
    )
    .limit(1);
  return row !== undefined;
}
