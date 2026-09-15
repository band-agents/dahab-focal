import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import type { OtpTransport } from '@dahab/api-contract';

import { logger } from '../logger.ts';

/**
 * Phone OTP.
 *
 * The gateway is behind an interface because the Egyptian SMS market is a
 * moving target — aggregators change, prices change, and delivery to Vodafone
 * EG is not the same problem as delivery to a Russian roaming number. The auth
 * flow must not care which one is answering today.
 */

export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = 5 * 60;
export const OTP_MAX_ATTEMPTS = 5;
/** A resend before this has elapsed is refused rather than queued. */
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

/** Cryptographically uniform, and never Math.random. */
export function generateOtp(length = OTP_LENGTH): string {
  let code = '';
  for (let index = 0; index < length; index += 1) {
    code += String(randomInt(0, 10));
  }
  return code;
}

function pepper(): string {
  const value = process.env['AUTH_SECRET'];
  if (value === undefined || value.length < 32) {
    throw new Error('AUTH_SECRET must be set and at least 32 characters.');
  }
  return value;
}

/**
 * Hashed with the destination mixed in, so a code captured for one number
 * cannot be replayed against another.
 */
export function hashOtp(code: string, destination: string): string {
  return createHmac('sha256', pepper()).update(`${destination}:${code}`).digest('base64url');
}

export function verifyOtp(code: string, destination: string, storedHash: string): boolean {
  const expected = Buffer.from(storedHash, 'utf8');
  const provided = Buffer.from(hashOtp(code, destination), 'utf8');
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

/**
 * Development transport: prints the code rather than sending it. Refuses to
 * load when NODE_ENV is production, because the failure mode of shipping it
 * is every one-time code in the application log.
 */
export function createConsoleOtpTransport(): OtpTransport {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error(
      'The console OTP transport cannot run in production — it would log every code.',
    );
  }
  return {
    name: 'console',
    async send({ to, code, locale }) {
      logger.warn('OTP (console transport — development only)', {
        to: `${to.slice(0, 4)}…${to.slice(-2)}`,
        locale,
        // Printed deliberately, here and nowhere else. The field is named so
        // it is obvious in a log that this is the development transport.
        developmentOnlyCode: code,
      });
      return { messageId: `console-${Date.now()}` };
    },
  };
}

/**
 * The shape a real gateway implements. Left unimplemented on purpose: picking
 * between SMSMisr, Vodafone's aggregator and Twilio is a commercial decision,
 * not a technical one, and the interface is the part that has to exist now.
 */
export function createUnconfiguredOtpTransport(name: string): OtpTransport {
  return {
    name,
    async send() {
      throw new Error(
        `The "${name}" OTP transport is not implemented. Set OTP_TRANSPORT=console for local development.`,
      );
    },
  };
}

export function resolveOtpTransport(
  kind = process.env['OTP_TRANSPORT'] ?? 'console',
): OtpTransport {
  switch (kind) {
    case 'console':
      return createConsoleOtpTransport();
    default:
      return createUnconfiguredOtpTransport(kind);
  }
}

/** Egypt is the default country code; a bare 01… number is completed to +20. */
export const DEFAULT_COUNTRY_CALLING_CODE = '+20';

export function normalisePhone(input: string): string {
  const trimmed = input.replace(/[\s()-]/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  // Egyptian mobile numbers are written locally as 01XXXXXXXXX.
  if (trimmed.startsWith('0')) return `${DEFAULT_COUNTRY_CALLING_CODE}${trimmed.slice(1)}`;
  return `${DEFAULT_COUNTRY_CALLING_CODE}${trimmed}`;
}
