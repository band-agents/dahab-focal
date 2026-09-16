'use server';

import type { Route } from 'next';
import { redirect } from 'next/navigation';

import { isLocale, SOURCE_LOCALE } from '@dahab/i18n/server';

import { API_URL } from '@/lib/api';
import { accessToken, clearCredentials, storeCredentials } from '@/lib/session';

/**
 * Signing in, and signing out.
 *
 * Both are Server Actions rather than route handlers because only an action
 * or a handler may write a cookie, and an action keeps the form working with
 * no JavaScript on the page at all — which is the right default for the one
 * screen an operator has to reach when something else is broken.
 *
 * The password never leaves this function: not into a log line, not into a
 * redirect, not into an error message handed back to the page.
 */

interface Credentials {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

/**
 * Only ever an in-app path, and never one the caller can point elsewhere.
 * A `next` of `//evil.example` or `https://evil.example` is how a sign-in
 * form becomes an open redirect, and both survive a naive "starts with /".
 */
function safeNext(value: FormDataEntryValue | null, locale: string): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return `/${locale}`;
  }
  return value;
}

export async function signIn(formData: FormData): Promise<void> {
  const rawLocale = String(formData.get('locale') ?? '');
  const locale = isLocale(rawLocale) ? rawLocale : SOURCE_LOCALE;
  const next = safeNext(formData.get('next'), locale);

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  let credentials: Credentials | null = null;

  if (email !== '' && password !== '') {
    try {
      const response = await fetch(`${API_URL}/auth.passwordSignIn`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
        cache: 'no-store',
      });
      const payload = (await response.json()) as { result?: { data?: Credentials } };
      credentials = payload.result?.data ?? null;
    } catch {
      // The API being unreachable is a different failure from a wrong
      // password, and the page says so rather than blaming the operator for
      // their own credentials.
      redirectTo(locale, next, 'unreachable');
    }
  }

  if (credentials === null) {
    redirectTo(locale, next, 'invalid');
  }

  await storeCredentials(credentials);
  // `next` is already proven to be an in-app path by safeNext(); typedRoutes
  // just cannot see that through a string.
  redirect(next as Route);
}

/** `redirect` throws by design, so this never returns. */
function redirectTo(locale: string, next: string, error: string): never {
  const params = new URLSearchParams({ error });
  if (next !== `/${locale}`) params.set('next', next);
  redirect(`/${locale}/sign-in?${params.toString()}` as Route);
}

export async function signOut(formData: FormData): Promise<void> {
  const rawLocale = String(formData.get('locale') ?? '');
  const locale = isLocale(rawLocale) ? rawLocale : SOURCE_LOCALE;
  // Read from the cookie, never from a form field: a token in a hidden input
  // is in the page source, in any screenshot of it, and readable by anything
  // that gets a script onto the page — which is exactly what httpOnly is for.
  const token = (await accessToken()) ?? '';

  // Tell the API first, so the session row is revoked even if the browser
  // keeps a copy of the cookie somehow. Signing out has to end the session,
  // not merely forget it locally.
  if (token !== '') {
    try {
      await fetch(`${API_URL}/auth.signOut`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
        cache: 'no-store',
      });
    } catch {
      // Unreachable API: still drop the cookies. Leaving someone signed in
      // because the server did not answer is the wrong way to fail.
    }
  }

  await clearCredentials();
  redirect(`/${locale}/sign-in` as Route);
}
