'use server';

import { TRPCClientError } from '@trpc/client';
import type { Route } from 'next';
import { redirect } from 'next/navigation';

import { isLocale } from '@dahab/i18n/server';

import { api } from '@/lib/api';
import { MIN_PASSWORD_LENGTH, USERNAME } from '@/lib/password';
import { normalisePhone } from '@/lib/phone';

/**
 * Every change an operator makes, as a form post.
 *
 * Each one does its work, then sends the browser back to the screen it came
 * from with `?done=<key>` or `?error=<key>` — which the screen turns into one
 * sentence at the top. Forms rather than client-side calls, so a save works
 * on the oldest phone, with scripts off, and on the flakiest signal: the
 * worst case is a page that reloads, never a spinner that spins forever.
 *
 * Only the actions are exported. Everything a 'use server' file exports
 * becomes an endpoint, so the helpers stay private.
 */

function localeOf(form: FormData): string {
  const raw = String(form.get('locale') ?? '');
  return isLocale(raw) ? raw : 'ar-EG';
}

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? '').trim();
}

/** A password exactly as typed — a space at either end is part of it. */
function secret(form: FormData, key: string): string {
  return String(form.get(key) ?? '');
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What went wrong, as a key the screen knows how to say. */
type Failure = 'notAllowed' | 'unreachable' | 'failed' | 'conflict' | 'badInput' | 'signedOut' | 'precondition';

/** A name that is already somebody else's, as the error key the screen shows. */
const TAKEN = { username: 'usernameTaken', email: 'emailTaken', phone: 'phoneTaken' } as const;

async function attempt(work: () => Promise<unknown>): Promise<Failure | null> {
  try {
    await work();
    return null;
  } catch (error) {
    if (error instanceof TRPCClientError) {
      const code = (error.data as { code?: string } | null)?.code;
      if (code === 'FORBIDDEN') return 'notAllowed';
      if (code === 'UNAUTHORIZED') return 'signedOut';
      if (code === 'CONFLICT') return 'conflict';
      if (code === 'BAD_REQUEST') return 'badInput';
      if (code === 'PRECONDITION_FAILED') return 'precondition';
      if (code === 'NOT_FOUND') return 'failed';
      if (code === undefined) return 'unreachable';
      return 'failed';
    }
    return 'unreachable';
  }
}

/**
 * Back to a screen with the outcome in the address. A signed-out session goes
 * to sign-in instead: there is no point telling somebody their save failed
 * when what they need is the door.
 */
function back(locale: string, rest: string, outcome: { done: string } | { error: string }, hash = ''): never {
  if ('error' in outcome && outcome.error === 'signedOut') {
    redirect(`/${locale}/sign-in` as Route);
  }
  const query = new URLSearchParams(outcome).toString();
  const base = rest === '' ? `/${locale}` : `/${locale}/${rest}`;
  redirect(`${base}?${query}${hash}` as Route);
}

/** A number as somebody typed it, stored in the international form when it is one. */
function phoneOrAsTyped(value: string): string | null {
  if (value === '') return null;
  return normalisePhone(value) ?? value;
}

// ——— My page ———————————————————————————————————————————————————————————

export async function saveProfile(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const failure = await attempt(() =>
    api.vendor.updateProfile.mutate({
      tagline: text(form, 'tagline') || null,
      about: text(form, 'about') || null,
      phone: phoneOrAsTyped(text(form, 'phone')),
      whatsapp: phoneOrAsTyped(text(form, 'whatsapp')),
      email: text(form, 'email') || null,
      website: text(form, 'website') || null,
      addressLine: text(form, 'addressLine') || null,
    }),
  );
  back(locale, 'profile', failure === null ? { done: 'saved' } : { error: failure === 'badInput' ? 'badEmail' : failure });
}

/** A logo or cover, set straight after it uploads — or removed. */
export async function setProfileImage(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const slot = text(form, 'slot') === 'cover' ? 'cover' : 'logo';
  const mediaId = text(form, 'mediaId');
  const failure = await attempt(() =>
    api.vendor.setProfileImage.mutate({ slot, mediaId: mediaId === '' ? null : mediaId }),
  );
  back(
    locale,
    'profile',
    failure === null ? { done: mediaId === '' ? 'photoRemoved' : 'photoSaved' } : { error: failure },
  );
}

// ——— Me ————————————————————————————————————————————————————————————————

export async function saveMe(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const displayName = form.has('displayName') ? text(form, 'displayName') : undefined;
  const avatar = form.has('avatarMediaId') ? text(form, 'avatarMediaId') : undefined;
  if (displayName === '') back(locale, 'account', { error: 'emptyName' });

  const failure = await attempt(() =>
    api.vendor.updateMe.mutate({
      ...(displayName === undefined ? {} : { displayName }),
      ...(avatar === undefined ? {} : { avatarMediaId: avatar === '' ? null : avatar }),
    }),
  );
  back(locale, 'account', failure === null ? { done: 'saved' } : { error: failure });
}

/**
 * The names you sign in with: a username, an email, or both. Clearing one is
 * allowed as long as there is still some way in (the API checks nothing about
 * that — a person with a phone can sign in by code).
 */
export async function setLoginNames(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const username = text(form, 'username').toLowerCase();
  const email = text(form, 'email').toLowerCase();
  if (username !== '' && !USERNAME.test(username)) back(locale, 'account', { error: 'badUsername' }, '#login');
  if (email !== '' && !EMAIL.test(email)) back(locale, 'account', { error: 'badEmail' }, '#login');

  let taken: keyof typeof TAKEN | null = null;
  const failure = await attempt(async () => {
    const result = await api.vendor.setLoginNames.mutate({
      username: username === '' ? null : username,
      email: email === '' ? null : email,
    });
    if (!result.ok) taken = result.taken;
  });
  if (failure !== null) back(locale, 'account', { error: failure === 'badInput' ? 'badUsername' : failure }, '#login');
  if (taken !== null) back(locale, 'account', { error: TAKEN[taken] }, '#login');
  back(locale, 'account', { done: 'loginSaved' }, '#login');
}

/** Your own password. The current one is asked for only when one exists. */
export async function changePassword(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const newPassword = secret(form, 'newPassword');
  const repeat = secret(form, 'repeatPassword');
  const current = secret(form, 'currentPassword');
  if (newPassword.length < MIN_PASSWORD_LENGTH) back(locale, 'account', { error: 'shortPassword' }, '#password');
  if (newPassword !== repeat) back(locale, 'account', { error: 'notSame' }, '#password');

  const failure = await attempt(() =>
    api.vendor.changePassword.mutate({ newPassword, ...(current === '' ? {} : { currentPassword: current }) }),
  );
  if (failure === null) back(locale, 'account', { done: 'passwordSaved' }, '#password');
  back(locale, 'account', { error: failure === 'precondition' ? 'wrongCurrent' : failure }, '#password');
}

// ——— Stories ———————————————————————————————————————————————————————————

export async function postStory(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const mediaId = text(form, 'mediaId');
  if (mediaId === '') back(locale, 'stories/new', { error: 'pickFirst' });

  const failure = await attempt(() =>
    api.vendor.postStory.mutate({ mediaId, caption: text(form, 'caption') || null }),
  );
  if (failure !== null) {
    back(locale, 'stories/new', { error: failure === 'conflict' ? 'alreadyPosted' : failure });
  }
  back(locale, 'stories', { done: 'posted' });
}

export async function pinStory(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const pinned = text(form, 'pinned') === 'true';
  const failure = await attempt(() =>
    api.vendor.pinStory.mutate({ storyId: text(form, 'storyId'), pinned }),
  );
  back(locale, 'stories', failure === null ? { done: pinned ? 'pinned' : 'unpinned' } : { error: failure });
}

export async function deleteStory(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const failure = await attempt(() => api.vendor.deleteStory.mutate({ storyId: text(form, 'storyId') }));
  back(locale, 'stories', failure === null ? { done: 'removed' } : { error: failure });
}

// ——— Team ——————————————————————————————————————————————————————————————

/**
 * Add a person with a login of their own: a username and a first password the
 * owner tells them, and — if wanted — an email or a mobile number to sign in
 * with as well.
 */
export async function addTeamMember(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const displayName = text(form, 'displayName');
  const username = text(form, 'username').toLowerCase();
  const password = secret(form, 'password');
  const email = text(form, 'email').toLowerCase();
  const typedPhone = text(form, 'phone');
  const phone = typedPhone === '' ? undefined : normalisePhone(typedPhone);

  if (displayName === '') back(locale, 'team', { error: 'emptyName' }, '#new-member');
  if (!USERNAME.test(username)) back(locale, 'team', { error: 'badUsername' }, '#new-member');
  if (password.length < MIN_PASSWORD_LENGTH) back(locale, 'team', { error: 'shortPassword' }, '#new-member');
  if (email !== '' && !EMAIL.test(email)) back(locale, 'team', { error: 'badEmail' }, '#new-member');
  if (phone === null) back(locale, 'team', { error: 'badPhone' }, '#new-member');

  let taken: keyof typeof TAKEN | null = null;
  const failure = await attempt(async () => {
    const result = await api.vendor.addTeamMember.mutate({
      displayName,
      username,
      password,
      ...(email === '' ? {} : { email }),
      ...(phone === undefined ? {} : { phone }),
    });
    if (!result.ok) taken = result.taken;
  });
  if (failure !== null) back(locale, 'team', { error: failure }, '#new-member');
  if (taken !== null) back(locale, 'team', { error: TAKEN[taken] }, '#new-member');
  back(locale, 'team', { done: 'added' });
}

/** The owner gives a team member a new password — "I forgot it", handled in the centre. */
export async function resetTeamPassword(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const userId = text(form, 'userId');
  const newPassword = secret(form, 'newPassword');
  if (newPassword.length < MIN_PASSWORD_LENGTH) back(locale, 'team', { error: 'shortPassword' }, `#member-${userId}`);

  const failure = await attempt(() => api.vendor.resetTeamPassword.mutate({ userId, newPassword }));
  back(locale, 'team', failure === null ? { done: 'passwordReset' } : { error: failure }, `#member-${userId}`);
}

export async function removeTeamMember(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const failure = await attempt(() =>
    api.vendor.removeTeamMember.mutate({ userId: text(form, 'userId') }),
  );
  back(locale, 'team', failure === null ? { done: 'removed' } : { error: failure });
}

// ——— Reviews ———————————————————————————————————————————————————————————

export async function replyToReview(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const reviewId = text(form, 'reviewId');
  const reply = text(form, 'reply');
  if (reply.length < 2) back(locale, 'reviews', { error: 'emptyReply' }, `#review-${reviewId}`);

  const failure = await attempt(() => api.vendor.replyToReview.mutate({ reviewId, reply }));
  back(locale, 'reviews', failure === null ? { done: 'sent' } : { error: failure }, `#review-${reviewId}`);
}
