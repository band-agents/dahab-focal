import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearStored, readStored, signIn, writeStored } from '../src/auth';
import type { StoredSession } from '../src/auth';

/**
 * Who this app lets in, and what survives a restart.
 *
 * The role decision is the one that matters: a platform admin and a traveller
 * both hold real accounts, and signing either of them into the operator app
 * would put a dive centre's morning — its manifest, its medical notes — in
 * front of somebody who does not run it.
 */

/**
 * The store is mocked, not `localStorage`.
 *
 * Credentials go to the keychain on a phone and to `localStorage` on the web,
 * and `src/store.ts` is the seam between them — it imports `react-native` and
 * `expo-secure-store`, neither of which resolves under vitest. Mocking the
 * seam tests the logic on both platforms at once; mocking `localStorage`
 * would only ever have tested the web half.
 */
const store = new Map<string, string>();

vi.mock('../src/store', () => ({
  readRaw: (key: string) => store.get(key) ?? null,
  writeRaw: (key: string, value: string) => void store.set(key, value),
  removeRaw: (key: string) => void store.delete(key),
}));

vi.mock('../src/apiUrl', () => ({ API_URL: 'http://api.test' }));

beforeEach(() => {
  store.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function credentials(roles: string[], vendorId: string | null = null) {
  return {
    result: {
      data: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        session: { roles, vendorId },
      },
    },
  };
}

/** The sign-in call, then the profile read. */
function mockFetch(signInBody: unknown, profile: unknown = { result: { data: {} } }) {
  const json = vi.fn();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url.includes('passwordSignIn')
        ? { json: async () => signInBody }
        : { json: async () => profile },
    ),
  );
  return json;
}

describe('who gets into the operator app', () => {
  it('lets an owner in, and remembers the vendor they act for', async () => {
    mockFetch(credentials(['vendorOwner'], 'vendor-1'), {
      result: { data: { displayName: 'Mahmoud', vendorName: 'Fanous Divers' } },
    });

    const result = await signIn('owner@example.invalid', 'a-real-password');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.role).toBe('vendorOwner');
    expect(result.session.vendorId).toBe('vendor-1');
    expect(result.session.vendorName).toBe('Fanous Divers');
  });

  it('lets a guide in as staff', async () => {
    mockFetch(credentials(['vendorStaff'], 'vendor-1'));
    const result = await signIn('guide@example.invalid', 'a-real-password');
    expect(result.ok && result.session.role).toBe('vendorStaff');
  });

  it('refuses a platform admin', async () => {
    // A real account with every permission on the platform — and no business
    // being shown one centre's manifest as though it were theirs.
    mockFetch(credentials(['admin']));
    const result = await signIn('admin@example.invalid', 'a-real-password');
    expect(result).toEqual({ ok: false, reason: 'notVendor' });
  });

  it('refuses a traveller', async () => {
    mockFetch(credentials(['traveler']));
    const result = await signIn('traveller@example.invalid', 'a-real-password');
    expect(result).toEqual({ ok: false, reason: 'notVendor' });
  });

  it('prefers owner when an account holds both roles', async () => {
    // Someone who owns a centre and also guides at it. The wider role wins,
    // or they would lose their own money screen by helping out.
    mockFetch(credentials(['vendorStaff', 'vendorOwner'], 'vendor-1'));
    const result = await signIn('both@example.invalid', 'a-real-password');
    expect(result.ok && result.session.role).toBe('vendorOwner');
  });

  it('tells a dead network apart from a wrong password', async () => {
    // Dahab's signal drops often enough that conflating the two would blame
    // an operator for the network.
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await signIn('owner@example.invalid', 'pw')).toEqual({
      ok: false,
      reason: 'unreachable',
    });

    mockFetch({ error: { message: 'no' } });
    expect(await signIn('owner@example.invalid', 'pw')).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('does not fail the sign-in when the profile read does', async () => {
    // A greeting without a name is a small loss; keeping a guide out of the
    // app at the dock because one field did not load is a much larger one.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('passwordSignIn')) {
          return { json: async () => credentials(['vendorOwner'], 'vendor-1') };
        }
        throw new Error('offline');
      }),
    );
    const result = await signIn('owner@example.invalid', 'a-real-password');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.displayName).toBeNull();
    expect(result.session.vendorName).toBeNull();
  });
});

describe('what survives a restart', () => {
  const sample: StoredSession = {
    accessToken: 'a',
    refreshToken: 'r',
    role: 'vendorStaff',
    vendorId: 'vendor-1',
    email: 'guide@example.invalid',
    displayName: null,
    vendorName: 'Fanous Divers',
    locale: 'ar-EG',
  };

  it('round-trips', () => {
    writeStored(sample);
    expect(readStored()).toEqual(sample);
  });

  it('reads as signed out after a sign-out', () => {
    writeStored(sample);
    clearStored();
    expect(readStored()).toBeNull();
  });

  it('reads a corrupt entry as signed out rather than throwing', () => {
    // Launch is the worst possible moment for a crash, and a half-written
    // entry is exactly what a browser killed mid-write leaves behind.
    for (const junk of ['', '{', 'null', '{"accessToken":1}', '{"refreshToken":"r"}']) {
      store.set('dahab.vendor.session', junk);
      expect(readStored()).toBeNull();
    }
  });

  it('falls back to Arabic when the stored locale is not one of ours', () => {
    // This surface opens in Arabic. A bad value must not quietly make it
    // English — that is the app's first lie to a guide at the dock.
    store.set(
      'dahab.vendor.session',
      JSON.stringify({ ...sample, locale: 'klingon' }),
    );
    expect(readStored()?.locale).toBe('ar-EG');
  });
});
