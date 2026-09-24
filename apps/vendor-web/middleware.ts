import { NextResponse, type NextRequest } from 'next/server';

import { LOCALES } from '@dahab/i18n/server';

import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from './lib/session';

/**
 * The dashboard's front door. (Adapted from the admin console's, which
 * explains the two jobs below in full.)
 *
 * Two jobs, both of which have to happen before a page renders:
 *
 *  1. **Refresh.** The access cookie's max-age is the token's own TTL, so the
 *     browser drops it the moment it expires. "No access cookie but a refresh
 *     cookie" is therefore the signal to trade one in — and this is the only
 *     place that can, because Next refuses cookie writes during a render.
 *  2. **Turn anyone else away.** A request with neither cookie goes to the
 *     sign-in page and never reaches a screen that would query real bookings.
 *
 * This is the cheap gate, not the real one. A forged or revoked token passes
 * here and is caught by the console layout, which asks the API who the caller
 * is on every render. Both exist: this one saves rendering a whole page to
 * throw it away, and that one is what makes revocation take effect at once.
 */

const API_URL = process.env['DAHAB_API_URL'] ?? 'http://127.0.0.1:4000';

const LOCALE_SET: ReadonlySet<string> = new Set(LOCALES);

/**
 * Arabic when the path does not say. The people running a dive centre in
 * Dahab work in Arabic, so a bare link lands them there rather than in the
 * platform's English source language.
 */
const DEFAULT_LOCALE = 'ar-EG';

function localeOf(pathname: string): string {
  const first = pathname.split('/')[1] ?? '';
  return LOCALE_SET.has(first) ? first : DEFAULT_LOCALE;
}

function isSignInPath(pathname: string): boolean {
  return pathname.split('/')[2] === 'sign-in';
}

interface RefreshedCredentials {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

async function refresh(refreshToken: string): Promise<RefreshedCredentials | null> {
  try {
    const response = await fetch(`${API_URL}/auth.refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      // The refresh must not be served from a cache; it rotates the token and
      // a replayed response would hand back one already spent.
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      result?: { data?: RefreshedCredentials };
    };
    const data = payload.result?.data;
    return data?.accessToken === undefined ? null : data;
  } catch {
    // The API being unreachable is not a reason to sign someone out — it is a
    // reason to let the page render and say so. The layout's own call will
    // fail in the same way and the console shows a "cannot reach" notice.
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const locale = localeOf(pathname);

  if (isSignInPath(pathname)) return NextResponse.next();

  if (request.cookies.has(ACCESS_COOKIE)) return NextResponse.next();

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken !== undefined) {
    const credentials = await refresh(refreshToken);
    if (credentials !== null) {
      const response = NextResponse.next();
      response.cookies.set(
        ACCESS_COOKIE,
        credentials.accessToken,
        accessCookieOptions(credentials.expiresInSeconds),
      );
      // Rotated on every use, so the cookie has to be replaced rather than
      // left alone — the one the browser holds is already spent.
      response.cookies.set(REFRESH_COOKIE, credentials.refreshToken, refreshCookieOptions());
      return response;
    }
  }

  const signIn = new URL(`/${locale}/sign-in`, request.url);
  // Where they were going, so signing in lands them there rather than on the
  // dashboard. Only ever a path from this same request, never a caller-
  // supplied absolute URL — that is how a sign-in page becomes an open
  // redirect.
  const intended = `${pathname}${search}`;
  if (intended !== `/${locale}`) signIn.searchParams.set('next', intended);

  const response = NextResponse.redirect(signIn);
  // A stale refresh cookie that no longer works is cleared on the way out, so
  // the next request does not pay for another doomed round trip.
  if (refreshToken !== undefined) response.cookies.delete(REFRESH_COOKIE);
  return response;
}

export const config = {
  /**
   * Everything except Next's own assets, the bundled fonts and the favicon.
   * Matching those would mean a token refresh attempt for every woff2 on the
   * page.
   */
  //
  // `media` too: uploaded photos and videos are the operator's public face,
  // served through a rewrite to the API, and sending each thumbnail through a
  // token refresh would be a round trip per picture for nothing.
  matcher: ['/((?!_next/static|_next/image|fonts|media|favicon.ico).*)'],
};
