import { beforeAll, describe, expect, it } from 'vitest';

import { PERMISSIONS_BY_ROLE, can, canAny } from '@dahab/api-contract';

import { generateOtp, hashOtp, normalisePhone, verifyOtp } from '../src/auth/otp';
import { issueAccessToken, issueRefreshToken, hashRefreshToken, verifyAccessToken } from '../src/auth/tokens';

beforeAll(() => {
  process.env['AUTH_SECRET'] = 'test-secret-that-is-long-enough-to-be-accepted-here';
});

describe('the permission matrix', () => {
  it('lets a guest browse and nothing else', () => {
    expect(can('guest', 'catalog.read')).toBe(true);
    expect(can('guest', 'booking.createOwn')).toBe(false);
    expect(can('guest', 'review.write')).toBe(false);
    expect(PERMISSIONS_BY_ROLE.guest).toHaveLength(1);
  });

  it('keeps vendor staff away from money and from the vendor record', () => {
    expect(can('vendorStaff', 'booking.manageVendor')).toBe(true);
    expect(can('vendorStaff', 'resource.manage')).toBe(true);
    // Staff run the day; they do not set prices, pay themselves, or hire.
    expect(can('vendorStaff', 'pricing.manage')).toBe(false);
    expect(can('vendorStaff', 'payout.readOwn')).toBe(false);
    expect(can('vendorStaff', 'staff.manage')).toBe(false);
    expect(can('vendorStaff', 'vendor.writeOwn')).toBe(false);
    expect(can('vendorStaff', 'catalog.publish')).toBe(false);
  });

  it('gives an owner everything staff have, and then some', () => {
    for (const permission of PERMISSIONS_BY_ROLE.vendorStaff) {
      expect(can('vendorOwner', permission), permission).toBe(true);
    }
    expect(can('vendorOwner', 'catalog.publish')).toBe(true);
    expect(can('vendorOwner', 'pricing.manage')).toBe(true);
  });

  it('never lets a traveler reach another vendor or another traveler', () => {
    for (const permission of [
      'booking.readVendor',
      'booking.manageVendor',
      'vendor.readAny',
      'user.readAny',
      'review.moderate',
      'audit.read',
    ] as const) {
      expect(can('traveler', permission), permission).toBe(false);
    }
  });

  it('gives admin the moderation and audit powers, not the vendor-own ones', () => {
    expect(can('admin', 'review.moderate')).toBe(true);
    expect(can('admin', 'audit.read')).toBe(true);
    expect(can('admin', 'taxonomy.manage')).toBe(true);
    // An admin acts through the audited `.readAny` / `.manage` forms.
    expect(can('admin', 'vendor.writeOwn')).toBe(false);
    expect(can('admin', 'payout.readOwn')).toBe(false);
  });

  it('resolves a multi-role session to the union of its permissions', () => {
    expect(canAny(['traveler', 'vendorOwner'], 'pricing.manage')).toBe(true);
    expect(canAny(['traveler'], 'pricing.manage')).toBe(false);
  });
});

describe('access tokens', () => {
  const payload = {
    sessionId: '018f3a4b-0000-7000-8000-000000000001',
    userId: null,
    roles: ['guest'] as const,
    vendorId: null,
    isGuest: true,
    locale: 'ar-EG' as const,
  };

  it('round-trips', () => {
    const token = issueAccessToken(payload);
    const result = verifyAccessToken(token);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.sessionId).toBe(payload.sessionId);
      expect(result.payload.locale).toBe('ar-EG');
      expect(result.payload.isGuest).toBe(true);
    }
  });

  it('rejects a tampered payload', () => {
    const token = issueAccessToken(payload);
    const [body, signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ ...payload, roles: ['admin'], exp: Math.floor(Date.now() / 1000) + 600 }),
      'utf8',
    ).toString('base64url');
    void body;
    const result = verifyAccessToken(`${forged}.${signature ?? ''}`);
    expect(result).toEqual({ ok: false, reason: 'badSignature' });
  });

  it('rejects an expired token', () => {
    const token = issueAccessToken(payload, 1);
    const later = new Date(Date.now() + 5000);
    expect(verifyAccessToken(token, later)).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects anything that is not two parts', () => {
    expect(verifyAccessToken('nonsense')).toEqual({ ok: false, reason: 'malformed' });
    expect(verifyAccessToken('a.b.c')).toEqual({ ok: false, reason: 'malformed' });
  });

  it('stores only a hash of the refresh token', () => {
    const { token, hash } = issueRefreshToken();
    expect(hash).not.toBe(token);
    expect(hashRefreshToken(token)).toBe(hash);
    expect(token.length).toBeGreaterThanOrEqual(60);
  });
});

describe('phone numbers default to Egypt', () => {
  it('completes a local 01… number to +20', () => {
    expect(normalisePhone('01001234567')).toBe('+201001234567');
    expect(normalisePhone('010 0123 4567')).toBe('+201001234567');
  });

  it('leaves an international number alone', () => {
    expect(normalisePhone('+79161234567')).toBe('+79161234567');
    expect(normalisePhone('+39 333 1234567')).toBe('+393331234567');
  });
});

describe('one-time codes', () => {
  it('generates six digits', () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      expect(generateOtp()).toMatch(/^\d{6}$/);
    }
  });

  it('is not predictable across calls', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateOtp()));
    // 200 draws from a million values: collisions are possible but a small
    // set would mean the generator is broken.
    expect(codes.size).toBeGreaterThan(180);
  });

  it('verifies against its own destination and no other', () => {
    const code = '123456';
    const hash = hashOtp(code, '+201001234567');
    expect(verifyOtp(code, '+201001234567', hash)).toBe(true);
    // The same code sent to a different number must not validate.
    expect(verifyOtp(code, '+201007654321', hash)).toBe(false);
    expect(verifyOtp('654321', '+201001234567', hash)).toBe(false);
  });
});
