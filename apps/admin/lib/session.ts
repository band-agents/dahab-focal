import { cookies } from 'next/headers';

/**
 * The console's session, held in cookies.
 *
 * Two of them, because they have two different lifetimes and two different
 * jobs. The access token is short-lived and is what every API call carries;
 * the refresh token is long-lived and is only ever sent to `auth.refresh`.
 *
 * Both are httpOnly. The console renders on the server and no browser script
 * ever needs to read either, so making them readable would add nothing but a
 * way for one injected script to walk off with an admin session.
 *
 * The access cookie's max-age is the token's own TTL, so the browser drops it
 * at exactly the moment it stops being valid. That is what lets the middleware
 * treat "no access cookie, but a refresh cookie" as the signal to refresh,
 * instead of having to decode and date-check a token on every request.
 */

export const ACCESS_COOKIE = 'dahab.at';
export const REFRESH_COOKIE = 'dahab.rt';

/** 60 days, matching REFRESH_TOKEN_TTL_DAYS in the API. */
const REFRESH_MAX_AGE_SECONDS = 60 * 24 * 60 * 60;

export interface Credentials {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresInSeconds: number;
}

/**
 * Shared by the server action and the middleware, so the two places that
 * write these cookies cannot end up with different flags. `secure` is off
 * outside production only because localhost is not https — never as a
 * configurable.
 */
export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export function accessCookieOptions(expiresInSeconds: number) {
  return cookieOptions(expiresInSeconds);
}

export function refreshCookieOptions() {
  return cookieOptions(REFRESH_MAX_AGE_SECONDS);
}

/** The access token for this request, if the browser still has a live one. */
export async function accessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

/**
 * Writes a freshly issued pair. Only callable from a Server Action or a Route
 * Handler — Next refuses cookie writes during a page render, which is why the
 * refresh path lives in the middleware rather than in a layout.
 */
export async function storeCredentials(credentials: Credentials): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, credentials.accessToken, accessCookieOptions(credentials.expiresInSeconds));
  store.set(REFRESH_COOKIE, credentials.refreshToken, refreshCookieOptions());
}

export async function clearCredentials(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}
