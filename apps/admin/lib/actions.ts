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
  revalidatePath(`/${locale}/${section}`);
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
