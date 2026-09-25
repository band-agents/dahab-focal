import { formatDate } from '@dahab/i18n/server';

import { Avatar, Notice } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Confirm } from '@/components/ui/Confirm';
import { Field } from '@/components/ui/Field';
import { PasswordField } from '@/components/ui/PasswordField';
import { Icon } from '@/components/ui/Icon';
import { api, load } from '@/lib/api';
import { getMe } from '@/lib/data';
import { translator } from '@/lib/i18n';
import { MIN_PASSWORD_LENGTH } from '@/lib/password';
import { Heading, Outcome, resolveLocale } from '@/lib/page';

import { addTeamMember, removeTeamMember, resetTeamPassword } from '../actions';

/**
 * My team: everybody who can open this account.
 *
 * A person is added by name, a username and a first password the owner tells
 * them in person — the same kind of login Sky Eye makes — and, if wanted, an
 * email or a mobile number to sign in with too. The owner can give anyone on
 * the team a new password when they forget it. Under every name it says, in a
 * sentence, what they can do, so the owner is never guessing what "staff"
 * means.
 */

const MESSAGES = {
  added: 'partner.team.added',
  passwordReset: 'partner.team.passwordReset',
  badUsername: 'partner.account.badUsername',
  usernameTaken: 'partner.account.usernameTaken',
  emailTaken: 'partner.account.emailTaken',
  phoneTaken: 'partner.team.phoneTaken',
  badEmail: 'partner.account.badEmail',
  shortPassword: 'partner.account.shortPassword',
  removed: 'partner.team.removed',
  already: 'partner.team.already',
  badPhone: 'partner.team.badPhone',
  emptyName: 'partner.team.emptyName',
  notAllowed: 'partner.team.onlyOwner',
  unreachable: 'partner.common.unreachable',
  failed: 'partner.common.failed',
} as const;

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const { done, error } = await searchParams;
  const t = translator(locale);

  const [me, team] = await Promise.all([getMe(), load(() => api.vendor.team.query())]);
  if (!me.ok) return null;
  const owner = me.data.isOwner;
  const people = team.ok ? team.data : [];

  return (
    <div className="flex flex-col gap-5">
      <Heading title={t('partner.team.title')} subtitle={t('partner.team.subtitle')} />
      <Outcome locale={locale} done={done} error={error} messages={MESSAGES} />
      {team.ok ? null : <Notice tone="danger" title={t('partner.common.unreachable')} />}

      <Card title={t('partner.team.count', { count: people.length })} icon="people" flush>
        <ul className="divide-y divide-c-edge">
          {people.map((person) => (
            <li key={person.userId} id={`member-${person.userId}`} className="flex scroll-mt-20 flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={person.displayName ?? person.email ?? person.phone} url={person.avatarUrl} size={52} />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span dir="auto" className="min-w-0 truncate text-bodyL font-semibold text-c-text">
                      {person.displayName ?? person.phone ?? person.email ?? '—'}
                    </span>
                    {person.isMe ? (
                      <span className="rounded-pill bg-c-info-bg px-2 text-small font-semibold text-c-info">{t('partner.team.you')}</span>
                    ) : null}
                    <span
                      className={`rounded-pill px-2 text-small font-semibold ${
                        person.role === 'vendorOwner' ? 'bg-c-accent text-c-on-accent' : 'bg-c-raised text-c-text'
                      }`}
                    >
                      {person.role === 'vendorOwner' ? t('partner.team.owner') : t('partner.team.staff')}
                    </span>
                    {person.suspended ? (
                      <span className="rounded-pill bg-c-bad-bg px-2 text-small font-semibold text-c-bad">{t('partner.team.stopped')}</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-body text-c-muted">
                    {person.role === 'vendorOwner' ? t('partner.team.canOwner') : t('partner.team.canStaff')}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 text-small text-c-muted">
                    {person.username === null ? null : (
                      <span className="inline-flex items-center gap-1 font-semibold text-c-text" dir="ltr">
                        <Icon name="key" size={14} />
                        {person.username}
                      </span>
                    )}
                    {person.email === null || person.displayName === null ? null : (
                      <span className="inline-flex min-w-0 items-center gap-1" dir="ltr">
                        <Icon name="chat" size={14} />
                        <span className="truncate">{person.email}</span>
                      </span>
                    )}
                    {person.phone === null ? null : (
                      <span className="inline-flex items-center gap-1" dir="ltr">
                        <Icon name="phone" size={14} />
                        {person.phone}
                      </span>
                    )}
                    <span>{t('partner.team.since', { date: formatDate(new Date(person.since), { locale }, 'date') })}</span>
                  </p>
                </div>
              </div>
              {owner && !person.isMe && person.role === 'vendorStaff' ? (
                <div className="flex flex-col gap-1 sm:w-64">
                  <details>
                    <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md px-3 text-body font-semibold text-c-link hover:bg-c-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-c-focus [&::-webkit-details-marker]:hidden">
                      <Icon name="key" size={18} />
                      {t('partner.team.newPassword')}
                    </summary>
                    <form action={resetTeamPassword} className="mt-2 flex flex-col gap-3 rounded-md border border-c-edge bg-c-raised p-4">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="userId" value={person.userId} />
                      <PasswordField
                        name="newPassword"
                        label={t('partner.team.newPasswordLabel')}
                        hint={t('partner.team.newPasswordHint')}
                        autoComplete="new-password"
                        minLength={MIN_PASSWORD_LENGTH}
                        showLabel={t('partner.signIn.show')}
                        hideLabel={t('partner.signIn.hide')}
                        required
                      />
                      <Button type="submit" intent="primary" icon="key" block>
                        {t('partner.team.newPasswordSave')}
                      </Button>
                    </form>
                  </details>
                  <Confirm
                    label={t('partner.team.remove')}
                    icon="ban"
                    question={t('partner.team.removeQuestion', { name: person.displayName ?? person.username ?? person.phone ?? '' })}
                  >
                    <form action={removeTeamMember}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="userId" value={person.userId} />
                      <Button type="submit" intent="danger" icon="ban" block>
                        {t('partner.team.removeYes')}
                      </Button>
                    </form>
                  </Confirm>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      {owner ? (
        <div id="new-member" className="scroll-mt-20">
          <Card title={t('partner.team.add')} icon="plus">
            <form action={addTeamMember} className="flex flex-col gap-5">
              <input type="hidden" name="locale" value={locale} />
              <Field name="displayName" label={t('partner.team.addName')} maxLength={80} autoComplete="off" required />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  name="username"
                  label={t('partner.team.addUsername')}
                  hint={t('partner.account.usernameHint')}
                  maxLength={40}
                  autoComplete="off"
                  ltr
                  required
                />
                <PasswordField
                  name="password"
                  label={t('partner.team.addPassword')}
                  hint={t('partner.team.addPasswordHint')}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  showLabel={t('partner.signIn.show')}
                  hideLabel={t('partner.signIn.hide')}
                  required
                />
              </div>
              <details className="rounded-md border border-c-edge">
                <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-body font-semibold text-c-link [&::-webkit-details-marker]:hidden">
                  <Icon name="plus" size={18} />
                  {t('partner.team.addMore')}
                </summary>
                <div className="flex flex-col gap-5 border-t border-c-edge p-4">
                  <Field name="email" type="email" label={t('partner.account.emailOptional')} inputMode="email" autoComplete="off" ltr />
                  <Field
                    name="phone"
                    type="tel"
                    label={t('partner.team.addPhoneOptional')}
                    hint={t('partner.team.addPhoneHint')}
                    inputMode="tel"
                    placeholder="010 1234 5678"
                    autoComplete="off"
                    ltr
                  />
                </div>
              </details>
              <Notice tone="info" title={t('partner.team.addExplain')} />
              <Button type="submit" intent="primary" icon="plus" block>
                {t('partner.team.addButton')}
              </Button>
            </form>
          </Card>
        </div>
      ) : (
        <Notice tone="info" title={t('partner.team.onlyOwner')} />
      )}
    </div>
  );
}
