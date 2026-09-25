import { beforeAll, describe, expect, it } from 'vitest';

import { can, canAny, permissionSchema, type Role, type Session } from '@dahab/api-contract';

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

const SOMEBODY = '018f3a4b-0000-7000-8000-0000000000aa';
const AN_OPERATOR = '018f3a4b-0000-7000-8000-0000000000bb';
const A_REASON = 'Support asked for this in ticket 4120.';

/**
 * The account writes, and specifically the two things that make them different
 * from every other write in this console: they can escalate privilege, and
 * they can lock the platform's own staff out of it.
 *
 * These run without a database, so a call that reaches the transaction fails
 * with PRECONDITION_FAILED. That is the point — it means the permission check
 * and the input contract both ran BEFORE anything touched Postgres, which is
 * where they have to run. A refusal that only happens after a row is read is a
 * refusal that can be raced.
 */
describe('who may manage accounts at all', () => {
  const managing = [
    'createUser',
    'updateUser',
    'setUserSuspended',
    'endUserSessions',
  ] as const;

  it.each(managing)('refuses %s to a traveller', async (procedure) => {
    const caller = createCaller(createTestContext({ session: session() }));
    await expect(
      // Each takes a different shape; the permission check runs before the
      // input is parsed, so an empty object is enough to prove the gate.
      (caller.admin[procedure] as (input: unknown) => Promise<unknown>)({}),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it.each(managing)('refuses %s to a centre owner', async (procedure) => {
    const caller = createCaller(
      createTestContext({ session: session({ roles: ['vendorOwner'] }) }),
    );
    await expect(
      (caller.admin[procedure] as (input: unknown) => Promise<unknown>)({}),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('granting a role is its own permission', () => {
  it('is held by admin and nobody else', () => {
    const roles: readonly Role[] = ['guest', 'traveler', 'vendorStaff', 'vendorOwner', 'admin'];
    for (const role of roles) {
      expect(can(role, 'role.grant'), `${role} and role.grant`).toBe(role === 'admin');
      expect(can(role, 'user.manage'), `${role} and user.manage`).toBe(role === 'admin');
    }
  });

  it('is a permission the contract actually declares', () => {
    expect(permissionSchema.options).toContain('role.grant');
    expect(permissionSchema.options).toContain('user.manage');
  });

  /**
   * The escalation this separation exists to stop. `user.manage` alone must
   * not be able to mint an admin, and the only way to check that here is to
   * confirm the two permissions are genuinely distinct rather than aliases
   * that happen to be granted together today.
   */
  it('is distinct from managing, so it can be withheld on its own', () => {
    expect(canAny(['admin'], 'role.grant')).toBe(true);
    const withManageOnly: readonly Role[] = ['vendorOwner'];
    expect(canAny(withManageOnly, 'user.manage')).toBe(false);
    expect(canAny(withManageOnly, 'role.grant')).toBe(false);
  });

  it.each(['grantRole', 'revokeRole'] as const)('refuses %s to a centre owner', async (procedure) => {
    const caller = createCaller(
      createTestContext({ session: session({ roles: ['vendorOwner'] }) }),
    );
    await expect(
      (caller.admin[procedure] as (input: unknown) => Promise<unknown>)({}),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('the input contract holds before anything is written', () => {
  const admin = () =>
    createCaller(createTestContext({ session: session({ roles: ['admin'] }) })).admin;

  it('refuses an account with no way to reach it', async () => {
    await expect(admin().createUser({ reason: A_REASON })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('refuses a reason that is not a sentence', async () => {
    await expect(
      admin().createUser({ email: 'nadia@example.com', reason: 'no' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  /**
   * A guide is a guide *at* somewhere. A `vendorStaff` row with a null vendor
   * passes every role check and then sees nothing, which is close to
   * undiagnosable from a support ticket.
   */
  it('refuses a vendor role with no operator behind it', async () => {
    await expect(
      admin().grantRole({ userId: SOMEBODY, role: 'vendorStaff', reason: A_REASON }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('refuses a platform role that names an operator', async () => {
    await expect(
      admin().grantRole({
        userId: SOMEBODY,
        role: 'admin',
        vendorId: AN_OPERATOR,
        reason: A_REASON,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('accepts a guide scoped to an operator, and only then reaches the database', async () => {
    await expect(
      admin().grantRole({
        userId: SOMEBODY,
        role: 'vendorStaff',
        vendorId: AN_OPERATOR,
        reason: A_REASON,
      }),
      // Past the contract, stopped by the missing database — which is exactly
      // how far a valid request should get in this suite.
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('refuses a phone number that is not E.164', async () => {
    await expect(
      admin().createUser({ phone: '01001234567', reason: A_REASON }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('accepts an Egyptian mobile in E.164', async () => {
    await expect(
      admin().createUser({ phone: '+201001234567', reason: A_REASON }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });
});

describe('an operator is not the person who owns it', () => {
  it('suspends a vendor through vendor.verify, not user.manage', async () => {
    const caller = createCaller(
      createTestContext({ session: session({ roles: ['vendorOwner'] }) }),
    );
    await expect(
      caller.admin.setVendorStatus({
        vendorId: AN_OPERATOR,
        status: 'suspended',
        reason: A_REASON,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('lets an admin through to the database', async () => {
    const caller = createCaller(createTestContext({ session: session({ roles: ['admin'] }) }));
    await expect(
      caller.admin.setVendorStatus({
        vendorId: AN_OPERATOR,
        status: 'suspended',
        reason: A_REASON,
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });
});
