import { beforeAll, describe, expect, it } from 'vitest';

import type { Session } from '@dahab/api-contract';

import { createTestContext } from '../src/context';
import { pickSlug, slugFor } from '../src/routers/admin-onboarding';
import { appRouter } from '../src/routers/index';
import { createCallerFactory } from '../src/trpc';

beforeAll(() => {
  process.env['AUTH_SECRET'] = 'test-secret-that-is-long-enough-to-be-accepted-here';
});

const createCaller = createCallerFactory(appRouter);

function as(roles: Session['roles']) {
  return createCaller(
    createTestContext({
      session: {
        id: '018f3a4b-0000-7000-8000-000000000001',
        userId: null,
        roles,
        vendorId: null,
        isGuest: false,
        expiresAt: new Date('2026-12-31T00:00:00Z'),
      } as Session,
    }),
  );
}

const A_CENTRE = {
  displayName: 'Red Sea Relax Divers',
  legalName: 'Red Sea Relax for Diving Services',
  neighborhood: 'masbat',
  phone: '+201001234567',
  owner: { displayName: 'Mahmoud Saleh', phone: '+201112223334' },
  reason: 'Signed the operator agreement at the office today.',
};

/**
 * Creating an operator, checked the way the other console writes are: without
 * a database, so a call that gets as far as the transaction fails with
 * PRECONDITION_FAILED — which proves the permission and the input contract
 * both ran first.
 */
describe('creating an operator from the roster', () => {
  it('refuses anyone who is not a platform admin', async () => {
    await expect(as(['vendorOwner']).admin.createVendor(A_CENTRE)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(as(['traveler']).admin.createVendor(A_CENTRE)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('will not make an owner nobody can reach', async () => {
    await expect(
      as(['admin']).admin.createVendor({ ...A_CENTRE, owner: { displayName: 'Mahmoud Saleh' } }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('wants a reason that is a sentence', async () => {
    await expect(
      as(['admin']).admin.createVendor({ ...A_CENTRE, reason: 'new' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('wants phone numbers in E.164, the form the rest of the platform stores', async () => {
    await expect(
      as(['admin']).admin.createVendor({
        ...A_CENTRE,
        owner: { displayName: 'Mahmoud Saleh', phone: '01112223334' },
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('reaches the database only once the permission and the input pass', async () => {
    await expect(as(['admin']).admin.createVendor(A_CENTRE)).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });
  });

  it('takes no password — the login is a separate step', async () => {
    await expect(
      as(['admin']).admin.createVendor({ ...A_CENTRE, password: 'let-me-in-please' } as never),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    // Zod strips the unknown key rather than storing it, which is the point:
    // there is no column on this path a password could land in.
  });
});

describe('the slug an operator is filed under', () => {
  it('is made from the display name', () => {
    expect(slugFor('Fanous Divers')).toBe('fanous-divers');
    expect(slugFor('Blue Beach Freediving')).toBe('blue-beach-freediving');
  });

  it('drops accents rather than the letters under them', () => {
    expect(slugFor('Café Ñandú Snorkel')).toBe('cafe-nandu-snorkel');
  });

  it('falls back to the legal name when the display name is Arabic only', () => {
    expect(slugFor('مركز الفانوس', 'Fanous Diving Centre LLC')).toBe('fanous-diving-centre-llc');
  });

  it('never comes out empty', () => {
    expect(slugFor('مركز الفانوس', 'شركة الفانوس')).toBe('operator');
  });

  it('takes the next free number when the name is already filed', () => {
    expect(pickSlug('fanous-divers', new Set())).toBe('fanous-divers');
    expect(pickSlug('fanous-divers', new Set(['fanous-divers']))).toBe('fanous-divers-2');
    expect(
      pickSlug('operator', new Set(['operator', 'operator-2', 'operator-3'])),
    ).toBe('operator-4');
  });
});
