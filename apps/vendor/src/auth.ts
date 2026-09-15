import type { Locale } from '@dahab/i18n';
import { SOURCE_LOCALE, isLocale } from '@dahab/i18n';

/**
 * Signing in to the operator app.
 *
 * Plain `fetch` rather than a tRPC client: sign-in is two calls and the app
 * carries no client today, so adding one would be a dependency for two
 * requests. The API is where every rule lives; this only moves tokens.
 *
 * Credentials are held in `localStorage`. That is a real trade-off and worth
 * naming: it is readable by any script that gets onto the page, unlike the
 * console's httpOnly cookies. The console can use cookies because it renders
 * on a server; this app is a client that calls an API from the browser, and a
 * cookie it cannot read is a cookie it cannot send. When this ships to the
 * app stores the store moves to expo-secure-store, which is the keychain —
 * see the note in `docs/SESSION-ADMIN-VENDOR.md`.
 */

export type VendorRole = 'vendorOwner' | 'vendorStaff';

export interface StoredSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly role: VendorRole;
  readonly vendorId: string | null;
  readonly email: string | null;
  /** Their own name, and their operator's. Both come from the API. */
  readonly displayName: string | null;
  readonly vendorName: string | null;
  readonly locale: Locale;
}

const KEY = 'dahab.vendor.session';

export const API_URL =
  process.env['EXPO_PUBLIC_DAHAB_API_URL'] ?? 'http://127.0.0.1:4000';

/**
 * Read synchronously at module scope, the way the URL parameters were, so the
 * first paint is already in the right language and direction. An async read
 * here would mean a flash of English on an Arabic-first surface.
 */
export function readStored(): StoredSession | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof parsed.accessToken !== 'string' || typeof parsed.refreshToken !== 'string') {
      return null;
    }
    const role: VendorRole = parsed.role === 'vendorStaff' ? 'vendorStaff' : 'vendorOwner';
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      role,
      vendorId: typeof parsed.vendorId === 'string' ? parsed.vendorId : null,
      email: typeof parsed.email === 'string' ? parsed.email : null,
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : null,
      vendorName: typeof parsed.vendorName === 'string' ? parsed.vendorName : null,
      locale:
        typeof parsed.locale === 'string' && isLocale(parsed.locale) ? parsed.locale : 'ar-EG',
    };
  } catch {
    // A corrupt entry reads as "not signed in" rather than taking the app
    // down on launch — the worst possible moment for a crash.
    return null;
  }
}

export function writeStored(value: StoredSession): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(value));
}

export function clearStored(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(KEY);
}

export type SignInResult =
  | { ok: true; session: StoredSession }
  | { ok: false; reason: 'invalid' | 'notVendor' | 'unreachable' };

interface Credentials {
  accessToken: string;
  refreshToken: string;
  session: { roles: string[]; vendorId: string | null };
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  let credentials: Credentials;
  try {
    const response = await fetch(`${API_URL}/auth.passwordSignIn`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const payload = (await response.json()) as { result?: { data?: Credentials } };
    if (payload.result?.data === undefined) return { ok: false, reason: 'invalid' };
    credentials = payload.result.data;
  } catch {
    // A dead API and a wrong password are different facts, and Dahab's signal
    // drops often enough that conflating them would blame the operator for
    // the network.
    return { ok: false, reason: 'unreachable' };
  }

  const role = credentials.session.roles.includes('vendorOwner')
    ? 'vendorOwner'
    : credentials.session.roles.includes('vendorStaff')
      ? 'vendorStaff'
      : null;

  if (role === null) {
    // A real account, but not an operator's. Signing a traveller or an admin
    // into the operator app would show them a dive centre's day; refusing is
    // the only correct answer.
    return { ok: false, reason: 'notVendor' };
  }

  // Who they are and which centre they run, asked once here rather than on
  // every screen. A greeting with a fabricated name was the old shape and it
  // is exactly the kind of placeholder that survives to production.
  const profile = await readProfile(credentials.accessToken);

  const stored: StoredSession = {
    accessToken: credentials.accessToken,
    refreshToken: credentials.refreshToken,
    role,
    vendorId: credentials.session.vendorId,
    email,
    displayName: profile.displayName,
    vendorName: profile.vendorName,
    locale: readStored()?.locale ?? 'ar-EG',
  };
  writeStored(stored);
  return { ok: true, session: stored };
}

/**
 * Their name and their operator's, from `auth.session`.
 *
 * Failing here does not fail the sign-in: a greeting without a name is a
 * small loss, and refusing to let a guide into the app because one field did
 * not load would be a much larger one.
 */
async function readProfile(
  accessToken: string,
): Promise<{ displayName: string | null; vendorName: string | null }> {
  try {
    const response = await fetch(`${API_URL}/auth.session`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const payload = (await response.json()) as {
      result?: { data?: { displayName?: string | null; vendorName?: string | null } };
    };
    return {
      displayName: payload.result?.data?.displayName ?? null,
      vendorName: payload.result?.data?.vendorName ?? null,
    };
  } catch {
    return { displayName: null, vendorName: null };
  }
}

export async function signOut(accessToken: string): Promise<void> {
  try {
    await fetch(`${API_URL}/auth.signOut`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({}),
    });
  } catch {
    // Unreachable API: still drop the local copy. Leaving someone signed in
    // because the server did not answer is the wrong way to fail.
  }
  clearStored();
}

/** The locale the app should open in, before anything has been signed into. */
export function initialLocale(fromUrl: string | null): Locale {
  const stored = readStored();
  if (stored !== null) return stored.locale;
  if (fromUrl === null) return 'ar-EG';
  return isLocale(fromUrl) ? fromUrl : SOURCE_LOCALE;
}
