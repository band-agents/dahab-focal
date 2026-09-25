'use server';

import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isLocale, SOURCE_LOCALE } from '@dahab/i18n/server';

import { api } from './api';

/**
 * The console's writes, from the screen's side.
 *
 * Each one is a Server Action posting a plain form, so the review panels work
 * with no JavaScript — the same reason the sign-in does. The API is where the
 * permission, the reason and the transaction are enforced; nothing here is a
 * second implementation of any of that, and the only thing these functions
 * decide is where the operator lands afterwards.
 *
 * Failures come back as a query parameter rather than a thrown page. A
 * conflict — someone else reviewed the same document a minute ago — is an
 * ordinary thing to tell an operator, not a crash.
 */

type Outcome = 'done' | 'conflict' | 'refused' | 'failed';

function classify(error: unknown): Outcome {
  const code = (error as { data?: { code?: string } } | null)?.data?.code;
  if (code === 'CONFLICT') return 'conflict';
  if (code === 'FORBIDDEN' || code === 'UNAUTHORIZED') return 'refused';
  return 'failed';
}

function localeOf(formData: FormData): string {
  const raw = String(formData.get('locale') ?? '');
  return isLocale(raw) ? raw : SOURCE_LOCALE;
}

/**
 * Back to the board, with the review panel closed and the outcome in the URL.
 *
 * `revalidatePath` first: the row that was just changed has to be re-read, or
 * the operator lands on a table still showing the state they acted on and
 * reasonably concludes nothing happened.
 */
function back(locale: string, section: string, outcome: Outcome): never {
  // The whole locale, layout included: the navigation lives in the layout
  // now and carries counts (documents waiting, papers expiring) that a write
  // on any one screen can change.
  revalidatePath(`/${locale}`, 'layout');
  redirect(`/${locale}/${section}?outcome=${outcome}` as Route);
}

export async function reviewDocument(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const documentId = String(formData.get('documentId') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();

  let outcome: Outcome = 'done';
  try {
    await api.admin.reviewDocument.mutate({
      documentId,
      decision: decision === 'rejected' ? 'rejected' : 'verified',
      reason,
    });
  } catch (error) {
    outcome = classify(error);
  }
  back(locale, 'vendors', outcome);
}

export async function reviewService(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const serviceId = String(formData.get('serviceId') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();

  let outcome: Outcome = 'done';
  try {
    await api.admin.reviewService.mutate({
      serviceId,
      decision: decision === 'rejected' ? 'rejected' : 'published',
      reason,
    });
  } catch (error) {
    outcome = classify(error);
  }
  back(locale, 'catalog', outcome);
}

export async function cancelDeparture(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const slotId = String(formData.get('slotId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();

  let outcome: Outcome = 'done';
  try {
    await api.admin.cancelDeparture.mutate({ slotId, reason });
  } catch (error) {
    outcome = classify(error);
  }
  back(locale, 'bookings', outcome);
}

/**
 * Back to wherever the operator was, rather than to a board.
 *
 * The three writes above all live on boards, so landing on the board was the
 * right answer. The account writes live on a person's own page, and sending
 * somebody back to the roster after suspending one account means they lose
 * their place and cannot see whether it worked. `to` is a path under the
 * locale, so a detail page names its own way home.
 */
function backTo(locale: string, to: string, outcome: Outcome): never {
  revalidatePath(`/${locale}`, 'layout');
  redirect(`/${locale}/${to}?outcome=${outcome}` as Route);
}

/** Where a form says it came from, or the roster if it did not say. */
function returnTo(formData: FormData, fallback: string): string {
  const raw = String(formData.get('returnTo') ?? '').trim();
  // Only a path under this console. A `returnTo` off an open form is an open
  // redirect, and this one is reachable by anyone who can reach the console.
  return /^[a-z0-9/_-]{1,120}$/i.test(raw) ? raw : fallback;
}

export async function createUser(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const displayName = String(formData.get('displayName') ?? '').trim();
  const countryCode = String(formData.get('countryCode') ?? '').trim();
  const role = String(formData.get('role') ?? '').trim();
  const vendorId = String(formData.get('vendorId') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();

  let outcome: Outcome = 'done';
  let created: string | null = null;
  try {
    const result = await api.admin.createUser.mutate({
      ...(email === '' ? {} : { email }),
      ...(phone === '' ? {} : { phone }),
      ...(displayName === '' ? {} : { displayName }),
      ...(countryCode === '' ? {} : { countryCode }),
      roles:
        role === ''
          ? []
          : [
              {
                role: role as 'admin' | 'traveler' | 'vendorOwner' | 'vendorStaff',
                ...(vendorId === '' ? {} : { vendorId }),
              },
            ],
      reason,
    });
    created = result.id;
  } catch (error) {
    outcome = classify(error);
  }

  // Straight to the account that was just made. The next thing anybody does
  // after creating one is look at it.
  backTo(locale, created === null ? 'people' : `people/${created}`, outcome);
}

export async function updateUser(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const userId = String(formData.get('userId') ?? '');
  const displayName = String(formData.get('displayName') ?? '').trim();
  const countryCode = String(formData.get('countryCode') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();

  let outcome: Outcome = 'done';
  try {
    await api.admin.updateUser.mutate({
      userId,
      // An empty box means "clear it", which is a different instruction from
      // "leave it alone" — the form always posts both fields, so an empty one
      // is deliberate.
      displayName: displayName === '' ? null : displayName,
      countryCode: countryCode === '' ? null : countryCode,
      reason,
    });
  } catch (error) {
    outcome = classify(error);
  }
  backTo(locale, returnTo(formData, `people/${userId}`), outcome);
}

export async function setUserSuspended(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const userId = String(formData.get('userId') ?? '');
  const suspended = String(formData.get('decision') ?? '') === 'suspend';
  const reason = String(formData.get('reason') ?? '').trim();

  let outcome: Outcome = 'done';
  try {
    await api.admin.setUserSuspended.mutate({ userId, suspended, reason });
  } catch (error) {
    outcome = classify(error);
  }
  backTo(locale, returnTo(formData, `people/${userId}`), outcome);
}

export async function endUserSessions(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const userId = String(formData.get('userId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();

  let outcome: Outcome = 'done';
  try {
    await api.admin.endUserSessions.mutate({ userId, reason });
  } catch (error) {
    outcome = classify(error);
  }
  backTo(locale, returnTo(formData, `people/${userId}`), outcome);
}

export async function changeRole(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const userId = String(formData.get('userId') ?? '');
  const role = String(formData.get('role') ?? '').trim();
  const vendorId = String(formData.get('vendorId') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();
  const revoking = String(formData.get('decision') ?? '') === 'revoke';

  const grant = {
    userId,
    role: role as 'admin' | 'traveler' | 'vendorOwner' | 'vendorStaff' | 'guest',
    ...(vendorId === '' ? {} : { vendorId }),
    reason,
  };

  let outcome: Outcome = 'done';
  try {
    if (revoking) await api.admin.revokeRole.mutate(grant);
    else await api.admin.grantRole.mutate(grant);
  } catch (error) {
    outcome = classify(error);
  }
  backTo(locale, returnTo(formData, `people/${userId}`), outcome);
}

export async function setVendorStatus(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const vendorId = String(formData.get('vendorId') ?? '');
  const status = String(formData.get('decision') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();

  let outcome: Outcome = 'done';
  try {
    await api.admin.setVendorStatus.mutate({
      vendorId,
      status: status === 'active' ? 'active' : status === 'closed' ? 'closed' : 'suspended',
      reason,
    });
  } catch (error) {
    outcome = classify(error);
  }
  backTo(locale, returnTo(formData, `vendors/${vendorId}`), outcome);
}

/**
 * A new operator and its owner, from the roster.
 *
 * On success, straight to the new operator's page — its papers and its
 * owner's login are the next two things anybody does. On a clash or a
 * refused field, back to the roster with the form still open and the reason
 * in the URL. The values typed are not carried back: they are names and phone
 * numbers, and a query string ends up in logs and in browser history.
 */
export async function createVendor(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const field = (name: string) => String(formData.get(name) ?? '').trim();
  const optional = (name: string) => (field(name) === '' ? {} : { [name]: field(name) });

  let landing = 'vendors?act=new&outcome=failed';
  try {
    const result = await api.admin.createVendor.mutate({
      displayName: field('displayName'),
      legalName: field('legalName'),
      neighborhood: field('neighborhood'),
      ...optional('phone'),
      ...optional('email'),
      owner: {
        displayName: field('ownerName'),
        ...(field('ownerPhone') === '' ? {} : { phone: field('ownerPhone') }),
        ...(field('ownerEmail') === '' ? {} : { email: field('ownerEmail') }),
      },
      reason: field('reason'),
    });
    landing = result.ok
      ? `vendors/${result.vendorId}?outcome=done`
      : `vendors?act=new&outcome=${
          result.taken === 'name' ? 'takenName' : result.taken === 'ownerEmail' ? 'takenEmail' : 'takenPhone'
        }`;
  } catch (error) {
    const code = (error as { data?: { code?: string } } | null)?.data?.code;
    landing = `vendors?act=new&outcome=${code === 'BAD_REQUEST' ? 'invalid' : classify(error)}`;
  }

  // After the try, never inside it: redirect() throws, and a catch would
  // swallow its own navigation (a bug this console has already had once).
  revalidatePath(`/${locale}`, 'layout');
  redirect(`/${locale}/${landing}` as Route);
}
