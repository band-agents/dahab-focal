import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import { LOCALES, resolveLocale, type Locale } from '@dahab/i18n/server';
import type { Role } from '@dahab/api-contract';

/**
 * Session tokens.
 *
 * HMAC-SHA-256 over a compact JSON payload, with the signature compared in
 * constant time. No JWT library: a JWT here would buy `alg` negotiation,
 * which is the part of JWT that causes the vulnerabilities, and nothing else
 * we need.
 *
 * The access token is short-lived and stateless. The refresh token is opaque
 * and stored hashed in `sessions`, so revoking a device is a row update
 * rather than a key rotation.
 */

export interface AccessTokenPayload {
  readonly sessionId: string;
  readonly userId: string | null;
  readonly roles: readonly Role[];
  readonly vendorId: string | null;
  readonly isGuest: boolean;
  readonly locale: Locale;
  /** Seconds since the epoch. */
  readonly exp: number;
}

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_DAYS = 60;

function secret(): Buffer {
  const value = process.env['AUTH_SECRET'];
  if (value === undefined || value.length < 32) {
    throw new Error(
      'AUTH_SECRET must be set and at least 32 characters. Generate one with: openssl rand -base64 48',
    );
  }
  return Buffer.from(value, 'utf8');
}

function base64Url(input: Buffer): string {
  return input.toString('base64url');
}

function sign(body: string): string {
  return base64Url(createHmac('sha256', secret()).update(body).digest());
}

export function issueAccessToken(
  payload: Omit<AccessTokenPayload, 'exp'>,
  ttlSeconds = ACCESS_TOKEN_TTL_SECONDS,
): string {
  const full: AccessTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = base64Url(Buffer.from(JSON.stringify(full), 'utf8'));
  return `${body}.${sign(body)}`;
}

export type VerifyResult =
  | { ok: true; payload: AccessTokenPayload }
  | { ok: false; reason: 'malformed' | 'badSignature' | 'expired' };

export function verifyAccessToken(token: string, now = new Date()): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'malformed' };

  const [body, signature] = parts;
  if (body === undefined || signature === undefined) return { ok: false, reason: 'malformed' };

  const expected = Buffer.from(sign(body), 'utf8');
  const provided = Buffer.from(signature, 'utf8');
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return { ok: false, reason: 'badSignature' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  if (!isAccessTokenPayload(parsed)) return { ok: false, reason: 'malformed' };
  if (parsed.exp * 1000 <= now.getTime()) return { ok: false, reason: 'expired' };

  return { ok: true, payload: parsed };
}

function isAccessTokenPayload(value: unknown): value is AccessTokenPayload {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['sessionId'] === 'string' &&
    (candidate['userId'] === null || typeof candidate['userId'] === 'string') &&
    Array.isArray(candidate['roles']) &&
    (candidate['vendorId'] === null || typeof candidate['vendorId'] === 'string') &&
    typeof candidate['isGuest'] === 'boolean' &&
    typeof candidate['locale'] === 'string' &&
    (LOCALES as readonly string[]).includes(candidate['locale']) &&
    typeof candidate['exp'] === 'number'
  );
}

/** Opaque, high-entropy, stored only as a hash. */
export function issueRefreshToken(): { token: string; hash: string } {
  const token = base64Url(randomBytes(48));
  return { token, hash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
  return base64Url(createHmac('sha256', secret()).update(token).digest());
}

export function newSessionId(): string {
  return randomUUID();
}

export function localeFrom(header: string | undefined): Locale {
  // Accept-Language, first entry only. Precise negotiation belongs at the
  // edge; the app sends an explicit preference once the user has one.
  const first = header?.split(',')[0]?.split(';')[0]?.trim();
  return resolveLocale(first);
}
