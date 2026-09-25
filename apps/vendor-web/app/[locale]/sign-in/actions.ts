'use server';

import type { Route } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { isLocale } from '@dahab/i18n/server';

import { API_URL } from '@/lib/api';
import { normalisePhone } from '@/lib/phone';
import { accessToken, clearCredentials, storeCredentials } from '@/lib/session';

/**
 * Signing in: a username or an email with a password (the default while text
 * messages are not wired up), or by phone — a number, then a code.
 *
 * The number an operator types is the one they know — `010 0123 4567`, the
 * Egyptian way — so it is turned into the international form here rather than
 * asking them to know what E.164 is. Between the two steps it is kept in a
 * short-lived httpOnly cookie, never in the page address, where it would end
 * up in browser history and in any screenshot of the address bar.
 */

const PENDING_COOKIE = 'dahab.partner.phone';

interface Credentials {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

function localeOf(formData: FormData): string {
  const raw = String(formData.get('locale') ?? '');
  return isLocale(raw) ? raw : 'ar-EG';
}


function to(locale: string, query: Record<string, string>): never {
  const params = new URLSearchParams(query);
  redirect(`/${locale}/sign-in?${params.toString()}` as Route);
}

async function call<T>(path: string, input: unknown): Promise<{ ok: true; data: T } | { ok: false; code: string }> {
  try {
    const response = await fetch(`${API_URL}/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
      cache: 'no-store',
    });
    const payload = (await response.json()) as {
      result?: { data?: T };
      error?: { data?: { code?: string } };
    };
    if (payload.result?.data !== undefined) return { ok: true, data: payload.result.data };
    return { ok: false, code: payload.error?.data?.code ?? 'UNKNOWN' };
  } catch {
    return { ok: false, code: 'UNREACHABLE' };
  }
}

/** Step one: send a code to this number. */
export async function sendCode(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const phone = normalisePhone(String(formData.get('phone') ?? ''));
  if (phone === null) to(locale, { method: 'phone', error: 'badPhone' });

  const result = await call('auth.phoneStart', { phone, locale });
  if (!result.ok) {
    to(locale, {
      method: 'phone',
      error:
        result.code === 'TOO_MANY_REQUESTS' ? 'wait' : result.code === 'UNREACHABLE' ? 'unreachable' : 'failed',
    });
  }

  const jar = await cookies();
  jar.set(PENDING_COOKIE, phone, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env['NODE_ENV'] === 'production',
    path: '/',
    // The code itself lasts five minutes; ten gives room to fetch the phone.
    maxAge: 10 * 60,
  });
  to(locale, { method: 'phone', step: 'code' });
}

/** Step two: the code that arrived. */
export async function verifyCode(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const jar = await cookies();
  const phone = jar.get(PENDING_COOKIE)?.value;
  if (phone === undefined) to(locale, { method: 'phone', error: 'expired' });

  // Accept the code with spaces or Arabic-Indic digits, as a phone may type it.
  const code = String(formData.get('code') ?? '')
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/\D/g, '');
  if (code.length !== 6) to(locale, { method: 'phone', step: 'code', error: 'badCode' });

  const result = await call<Credentials>('auth.phoneVerify', { phone, code });
  if (!result.ok) {
    to(locale, {
      method: 'phone',
      step: 'code',
      error: result.code === 'UNREACHABLE' ? 'unreachable' : result.code === 'FORBIDDEN' ? 'suspended' : 'badCode',
    });
  }

  jar.delete(PENDING_COOKIE);
  await storeCredentials(result.data);
  redirect(`/${locale}` as Route);
}

/** Start again with a different number. */
export async function changeNumber(formData: FormData): Promise<void> {
  const jar = await cookies();
  jar.delete(PENDING_COOKIE);
  to(localeOf(formData), { method: 'phone' });
}

/**
 * The main door: a username (made in Sky Eye or by the owner) or an email,
 * and a password. One box for both — a username can never contain an `@`.
 */
export async function passwordSignIn(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const identifier = String(formData.get('identifier') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (identifier === '' || password === '') to(locale, { error: 'badPassword' });

  const result = await call<Credentials>('auth.identifierSignIn', { identifier, password });
  if (!result.ok) {
    // Only a refusal of the credentials is "wrong password". Anything else
    // means the question was never asked — the lesson the admin console
    // learned when a paused database told people their password was wrong.
    to(locale, {
      error: result.code === 'UNAUTHORIZED' || result.code === 'BAD_REQUEST' ? 'badPassword' : 'unreachable',
    });
  }
  await storeCredentials(result.data);
  redirect(`/${locale}` as Route);
}

/**
 * Signing out ends the session on the API, not only in this browser. A phone
 * handed to a colleague must not keep a token that still works somewhere.
 */
export async function signOut(formData: FormData): Promise<void> {
  const token = await accessToken();
  if (token !== null) {
    try {
      await fetch(`${API_URL}/auth.signOut`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
        cache: 'no-store',
      });
    } catch {
      // Unreachable API: still drop the cookies. Leaving somebody signed in
      // because the server did not answer is the wrong way to fail.
    }
  }
  await clearCredentials();
  redirect(`/${localeOf(formData)}/sign-in` as Route);
}
