import { Avatar } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { LocaleSwitch } from '@/components/ui/LocaleSwitch';
import { PasswordField } from '@/components/ui/PasswordField';
import { Uploader } from '@/components/ui/Uploader';
import { getMe, getProfile } from '@/lib/data';
import { translator } from '@/lib/i18n';
import { MIN_PASSWORD_LENGTH } from '@/lib/password';
import { Heading, Outcome, resolveLocale } from '@/lib/page';
import { uploaderLabels } from '@/lib/uploader';

import { signOut } from '../../sign-in/actions';
import { saveMe, setSignIn } from '../actions';

/**
 * My account: the person, not the centre. Their own photo and name — what the
 * team sees beside a story they posted — how they sign in, the language, and
 * the way out.
 *
 * The sign-in card sets up an email and a password, or changes them. It asks
 * for the current password only when there is one, and for the new one twice,
 * because a typo in a password nobody can see is a locked-out owner.
 */

const MESSAGES = {
  saved: 'partner.common.saved',
  emptyName: 'partner.account.emptyName',
  passwordSaved: 'partner.account.passwordSaved',
  badEmail: 'partner.account.badEmail',
  shortPassword: 'partner.account.shortPassword',
  notSame: 'partner.account.notSame',
  wrongCurrent: 'partner.account.wrongCurrent',
  emailTaken: 'partner.account.emailTaken',
  notAllowed: 'partner.common.notAllowed',
  unreachable: 'partner.common.unreachable',
  failed: 'partner.common.failed',
} as const;

export default async function AccountPage({
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

  const [me, profile] = await Promise.all([getMe(), getProfile()]);
  if (!me.ok) return null;
  const m = me.data;

  return (
    <div className="flex flex-col gap-5">
      <Heading title={t('partner.account.title')} subtitle={t('partner.account.subtitle')} />
      <Outcome locale={locale} done={done} error={error} messages={MESSAGES} />

      <section className="flex items-center gap-4 rounded-lg border border-c-edge bg-c-surface p-5">
        <Avatar name={m.displayName} url={m.avatarUrl} size={64} />
        <div className="min-w-0">
          <p className="truncate text-h2 font-semibold text-c-text">{m.displayName ?? '—'}</p>
          <p className="text-body text-c-muted">
            {m.isOwner ? t('partner.team.owner') : t('partner.team.staff')}
            {profile.ok ? ` · ${profile.data.displayName}` : ''}
          </p>
        </div>
      </section>

      <Card title={t('partner.account.photo')} icon="image">
        <form action={saveMe} className="flex flex-col gap-2">
          <input type="hidden" name="locale" value={locale} />
          <div className="w-40">
            <Uploader purpose="avatar" name="avatarMediaId" shape="round" autoSubmit currentUrl={m.avatarUrl} labels={uploaderLabels(t, 'photo')} />
          </div>
          <p className="text-small text-c-muted">{t('partner.account.photoHint')}</p>
        </form>
      </Card>

      <Card title={t('partner.account.name')} icon="pencil">
        <form action={saveMe} className="flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <Field name="displayName" label={t('partner.account.name')} value={m.displayName} maxLength={80} required />
          <Button type="submit" intent="primary" icon="check" block>
            {t('partner.common.save')}
          </Button>
        </form>
      </Card>

      <div id="sign-in" className="scroll-mt-20">
        <Card title={t('partner.account.signInTitle')} icon="key">
          <p className="mb-4 text-body text-c-muted">
            {m.hasPassword ? t('partner.account.signInHas') : t('partner.account.signInNone')}
          </p>
          <form action={setSignIn} className="flex flex-col gap-5">
            <input type="hidden" name="locale" value={locale} />
            <Field
              name="email"
              type="email"
              label={t('partner.account.email')}
              value={m.email}
              inputMode="email"
              autoComplete="username"
              ltr
              required
            />
            {m.hasPassword ? (
              <PasswordField
                name="currentPassword"
                label={t('partner.account.currentPassword')}
                autoComplete="current-password"
                showLabel={t('partner.signIn.show')}
                hideLabel={t('partner.signIn.hide')}
                required
              />
            ) : null}
            <PasswordField
              name="newPassword"
              label={m.hasPassword ? t('partner.account.newPassword') : t('partner.account.password')}
              hint={t('partner.account.passwordHint')}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              showLabel={t('partner.signIn.show')}
              hideLabel={t('partner.signIn.hide')}
              required
            />
            <PasswordField
              name="repeatPassword"
              label={t('partner.account.repeatPassword')}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              showLabel={t('partner.signIn.show')}
              hideLabel={t('partner.signIn.hide')}
              required
            />
            <Button type="submit" intent="primary" icon="key" block>
              {m.hasPassword ? t('partner.account.changePassword') : t('partner.account.setPassword')}
            </Button>
          </form>
          {m.phone === null ? null : (
            <p className="mt-4 flex items-center gap-2 border-t border-c-edge pt-4 text-body text-c-muted">
              <Icon name="phone" size={18} />
              {t('partner.account.phoneToo')}
              <span dir="ltr" className="font-semibold text-c-text">{m.phone}</span>
            </p>
          )}
        </Card>
      </div>

      <Card title={t('partner.account.language')} icon="globe">
        <LocaleSwitch current={locale} rest="account" />
      </Card>

      <form action={signOut}>
        <input type="hidden" name="locale" value={locale} />
        <Button type="submit" intent="danger" icon="signOut" block>
          {t('partner.account.signOut')}
        </Button>
      </form>
    </div>
  );
}
