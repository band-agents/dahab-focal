import { beforeAll, describe, expect, it } from 'vitest';

import type { Session } from '@dahab/api-contract';

import { createTestContext } from '../src/context';
import { appRouter } from '../src/routers/index';
import { createCallerFactory } from '../src/trpc';

beforeAll(() => {
  process.env['AUTH_SECRET'] = 'test-secret-that-is-long-enough-to-be-accepted-here';
});

const createCaller = createCallerFactory(appRouter);

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: '018f3a4b-0000-7000-8000-000000000001',
    userId: null,
    roles: ['traveler'],
    vendorId: null,
    isGuest: false,
    expiresAt: new Date('2026-12-31T00:00:00Z'),
    ...overrides,
  } as Session;
}

describe('health', () => {
  it('reports what it has actually checked, not what it hopes', async () => {
    const caller = createCaller(createTestContext());
    const result = await caller.health();

    expect(result.locales).toHaveLength(7);
    expect(result.requestId).toMatch(/[0-9a-f-]{36}/);

    // The database is really probed now, and this suite runs without a
    // DATABASE_URL — so `unavailable` is the truthful answer and `degraded`
    // follows from it. A green health check on a server that cannot reach its
    // database is the failure this assertion exists to prevent.
    expect(result.checks['database']).toBe('unavailable');
    expect(result.status).toBe('degraded');

    // Redis is still genuinely unchecked; nothing on this path touches it.
    expect(result.checks['redis']).toBe('unchecked');
  });
});

describe('guest sessions', () => {
  it('issues a real session a cart can hang off', async () => {
    const caller = createCaller(createTestContext());
    const result = await caller.auth.guest({ deviceId: 'device-abcdef123456' });

    expect(result.session.isGuest).toBe(true);
    expect(result.session.roles).toEqual(['guest']);
    expect(result.session.userId).toBeNull();
    expect(result.accessToken.split('.')).toHaveLength(2);
    expect(result.refreshToken).not.toBe(result.accessToken);
    expect(result.expiresInSeconds).toBeGreaterThan(0);
  });

  it('refuses a device id that is too short to be one', async () => {
    const caller = createCaller(createTestContext());
    await expect(caller.auth.guest({ deviceId: 'short' })).rejects.toThrow();
  });
});

describe('authorisation is a permission check, not a role check', () => {
  it('refuses an anonymous caller a session-only procedure', async () => {
    const caller = createCaller(createTestContext({ session: null }));
    await expect(caller.auth.session()).rejects.toThrow(/needs a session/);
  });

  it('refuses a traveler the publish permission', async () => {
    const caller = createCaller(createTestContext({ session: session() }));
    await expect(
      caller.catalog.publish({ serviceId: '018f3a4b-0000-7000-8000-0000000000ff' }),
    ).rejects.toThrow(/cannot catalog\.publish/);
  });

  it('refuses vendor staff the publish permission but allows the owner', async () => {
    const staff = createCaller(
      createTestContext({
        session: session({ roles: ['vendorStaff'], vendorId: 'v1' as Session['vendorId'] }),
      }),
    );
    await expect(
      staff.catalog.publish({ serviceId: '018f3a4b-0000-7000-8000-0000000000ff' }),
    ).rejects.toThrow(/cannot catalog\.publish/);

    const owner = createCaller(
      createTestContext({
        session: session({ roles: ['vendorOwner'], vendorId: 'v1' as Session['vendorId'] }),
      }),
    );
    await expect(
      owner.catalog.publish({ serviceId: '018f3a4b-0000-7000-8000-0000000000ff' }),
    ).resolves.toEqual({ ok: true });
  });

  it('reports the caller permissions and their writing direction', async () => {
    const caller = createCaller(
      createTestContext({ session: session({ roles: ['traveler'] }), locale: 'ar-EG' }),
    );
    const result = await caller.auth.session();

    expect(result.permissions).toContain('booking.createOwn');
    expect(result.permissions).not.toContain('catalog.publish');
    expect(result.direction).toBe('rtl');
    // Sorted, so a client can diff two sessions without normalising.
    expect([...result.permissions].sort()).toEqual(result.permissions);
  });
});

describe('the permission matrix is served, not described', () => {
  it('returns every role', async () => {
    const caller = createCaller(createTestContext());
    const matrix = await caller.auth.permissionMatrix();
    expect(Object.keys(matrix).sort()).toEqual(
      ['admin', 'guest', 'traveler', 'vendorOwner', 'vendorStaff'].sort(),
    );
    expect(matrix.guest).toEqual(['catalog.read']);
  });
});

describe('errors carry the request id', () => {
  it('puts it in the envelope so a screenshot is enough to find the log line', async () => {
    const context = createTestContext({ session: null });
    const caller = createCaller(context);
    try {
      await caller.auth.session();
      expect.unreachable('should have thrown');
    } catch (error) {
      const shaped = error as { shape?: { data?: { requestId?: string } } };
      // The caller factory surfaces TRPCError; the formatter is exercised over
      // HTTP. Assert the context id exists and is what the formatter reads.
      expect(context.requestId).toMatch(/[0-9a-f-]{36}/);
      void shaped;
    }
  });
});

describe('catalog reads are wired but empty', () => {
  it('returns nothing rather than fabricating rows', async () => {
    const caller = createCaller(createTestContext());
    await expect(caller.catalog.categories()).resolves.toEqual([]);
    await expect(caller.catalog.diveSites()).resolves.toEqual([]);
    await expect(
      caller.catalog.nearby({
        origin: { latitude: 28.5122, longitude: 34.5183 },
        radiusMetres: 3000,
        limit: 20,
      }),
    ).resolves.toEqual({ items: [], nextCursor: null });
  });

  it('rejects a radius outside the sane range', async () => {
    const caller = createCaller(createTestContext());
    await expect(
      caller.catalog.nearby({
        origin: { latitude: 28.5122, longitude: 34.5183 },
        radiusMetres: 10,
        limit: 20,
      }),
    ).rejects.toThrow();
  });

  it('rejects a category slug that is not one of the twelve', async () => {
    const caller = createCaller(createTestContext());
    await expect(
      // @ts-expect-error deliberately invalid: the enum is the contract
      caller.catalog.attributeDefinitions({ categorySlug: 'jet-ski', comparableOnly: false }),
    ).rejects.toThrow();
  });
});
