import { beforeAll, describe, expect, it } from 'vitest';

import type { Role, Session } from '@dahab/api-contract';

import { createTestContext } from '../src/context';
import { appRouter } from '../src/routers/index';
import { createCallerFactory } from '../src/trpc';

beforeAll(() => {
  process.env['AUTH_SECRET'] = 'test-secret-that-is-long-enough-to-be-accepted-here';
});

const createCaller = createCallerFactory(appRouter);

const AN_OPERATOR = '018f3a4b-0000-7000-8000-0000000000bb';

/**
 * Everything under `admin.*` answers for the whole platform, so nobody but a
 * platform admin may reach any of it — read or write.
 *
 * The bug this pins: `admin.serviceQueue` was gated on `catalog.publish`,
 * which every vendor owner holds over their own catalogue, and its query had
 * no vendor filter. Any centre owner with a session could list every other
 * operator's drafts and rejected listings. It is the read-side twin of the
 * bug that produced `catalog.publishAny` for the write, and a hand-written
 * test per procedure would not have caught it, because nobody writes a test
 * for the procedure they did not think was risky.
 *
 * So this sweeps the router rather than naming procedures: a new admin
 * procedure gated on a vendor-scoped permission fails here the day it is
 * added. The permission middleware runs before input parsing, so calling with
 * no input is enough — a correctly gated procedure refuses before it looks.
 */

const ADMIN_PATHS = Object.keys(appRouter._def.procedures)
  .filter((path) => path.startsWith('admin.'))
  .sort();

const NOT_ADMIN: readonly Role[] = ['guest', 'traveler', 'vendorStaff', 'vendorOwner'];

function sessionFor(role: Role): Session {
  const vendorScoped = role === 'vendorOwner' || role === 'vendorStaff';
  return {
    id: '018f3a4b-0000-7000-8000-000000000001',
    userId: null,
    roles: [role],
    vendorId: vendorScoped ? AN_OPERATOR : null,
    isGuest: role === 'guest',
    expiresAt: new Date('2026-12-31T00:00:00Z'),
  } as Session;
}

type AnyProcedure = (input?: unknown) => Promise<unknown>;

/** Walks the caller proxy by dotted path, e.g. `admin.serviceQueue`. */
function procedureAt(role: Role, path: string): AnyProcedure {
  const caller = createCaller(createTestContext({ session: sessionFor(role) }));
  return path
    .split('.')
    .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], caller) as AnyProcedure;
}

async function codeOf(call: Promise<unknown>): Promise<string> {
  try {
    await call;
    return 'RESOLVED';
  } catch (error) {
    return (error as { code?: string }).code ?? 'UNKNOWN';
  }
}

describe('admin.* is for platform admins only', () => {
  it('finds the admin procedures to sweep', () => {
    // An empty list would make every assertion below vacuously true.
    expect(ADMIN_PATHS.length).toBeGreaterThan(30);
    expect(ADMIN_PATHS).toContain('admin.serviceQueue');
  });

  const cases = NOT_ADMIN.flatMap((role) => ADMIN_PATHS.map((path) => [role, path] as const));

  it.each(cases)('refuses %s the procedure %s', async (role, path) => {
    await expect(codeOf(procedureAt(role, path)())).resolves.toBe('FORBIDDEN');
  });

  it.each(ADMIN_PATHS)('lets an admin past the permission check on %s', async (path) => {
    // Without a database and without input, an admin's call fails on the
    // input contract or on the database — anything but FORBIDDEN. This is what
    // proves the sweep above measures the permission and not something else.
    await expect(codeOf(procedureAt('admin', path)())).resolves.not.toBe('FORBIDDEN');
  });
});
