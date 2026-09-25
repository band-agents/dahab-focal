'use server';

import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isLocale, SOURCE_LOCALE } from '@dahab/i18n/server';

import { api } from './api';

/**
 * Operator logins from Sky Eye: make one, or change a username and give a new
 * password. Each lands back on the operator's page with `?logins=<key>`, which
 * the Logins panel turns into one sentence — including which name was already
 * taken, because "conflict" alone does not tell an admin which box to change.
 *
 * The API holds every rule (operator accounts only, a reason, the audit row);
 * this file only decides where the admin lands.
 */

type Notice =
  | 'created'
  | 'updated'
  | 'usernameTaken'
  | 'emailTaken'
  | 'phoneTaken'
  | 'badInput'
  | 'refused'
  | 'failed';

const TAKEN = { username: 'usernameTaken', email: 'emailTaken', phone: 'phoneTaken' } as const;

function localeOf(formData: FormData): string {
  const raw = String(formData.get('locale') ?? '');
  return isLocale(raw) ? raw : SOURCE_LOCALE;
}

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '').trim();
}

function classify(error: unknown): Notice {
  const code = (error as { data?: { code?: string } } | null)?.data?.code;
  if (code === 'BAD_REQUEST') return 'badInput';
  if (code === 'FORBIDDEN' || code === 'UNAUTHORIZED') return 'refused';
  return 'failed';
}

function back(locale: string, vendorId: string, notice: Notice, reopen = ''): never {
  revalidatePath(`/${locale}`, 'layout');
  // A refused form reopens, so the admin fixes one box instead of starting over.
  redirect(`/${locale}/vendors/${vendorId}?logins=${notice}${reopen}#logins` as Route);
}

/** Only a uuid may name the operator we return to — never a path from the form. */
function vendorOf(formData: FormData): string {
  const raw = field(formData, 'vendorId');
  return /^[0-9a-f-]{36}$/i.test(raw) ? raw : '';
}

/** "010 1234 5678" or "+20 10…" to E.164, or undefined when empty. */
function phoneOf(raw: string): string | undefined {
  if (raw === '') return undefined;
  const compact = raw.replace(/[\s\-().]/g, '');
  if (compact.startsWith('+')) return compact;
  if (compact.startsWith('00')) return `+${compact.slice(2)}`;
  if (compact.startsWith('0')) return `+20${compact.slice(1)}`;
  return `+${compact}`;
}

export async function createVendorLogin(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const vendorId = vendorOf(formData);
  const email = field(formData, 'email').toLowerCase();
  const phone = phoneOf(field(formData, 'phone'));

  let notice: Notice = 'created';
  try {
    const result = await api.admin.createVendorLogin.mutate({
      vendorId,
      role: field(formData, 'role') === 'vendorOwner' ? 'vendorOwner' : 'vendorStaff',
      displayName: field(formData, 'displayName'),
      username: field(formData, 'username'),
      // Exactly as typed: a space at either end is part of a password.
      password: String(formData.get('password') ?? ''),
      ...(email === '' ? {} : { email }),
      ...(phone === undefined ? {} : { phone }),
      reason: field(formData, 'reason'),
    });
    if (!result.ok) notice = TAKEN[result.taken];
  } catch (error) {
    notice = classify(error);
  }
  back(locale, vendorId, notice, notice === 'created' ? '' : '&act=login-new');
}

export async function setVendorLogin(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const vendorId = vendorOf(formData);
  const userId = field(formData, 'userId');
  const username = field(formData, 'username');
  const newPassword = String(formData.get('newPassword') ?? '');

  let notice: Notice = 'updated';
  try {
    const result = await api.admin.setVendorLogin.mutate({
      userId,
      ...(username === '' ? {} : { username }),
      ...(newPassword === '' ? {} : { newPassword }),
      reason: field(formData, 'reason'),
    });
    if (!result.ok) notice = TAKEN[result.taken];
  } catch (error) {
    notice = classify(error);
  }
  back(locale, vendorId, notice, notice === 'updated' ? '' : `&act=login-edit&user=${encodeURIComponent(userId)}`);
}
