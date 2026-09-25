import type { Route } from 'next';
import Link from 'next/link';

import { Notice } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { LocaleSwitch } from '@/components/ui/LocaleSwitch';
import { PasswordField } from '@/components/ui/PasswordField';
import { translator } from '@/lib/i18n';
import { resolveLocale } from '@/lib/page';

import { changeNumber, passwordSignIn, sendCode, verifyCode } from './actions';

/**
 * The door. A username or an email, and a password — the login Sky Eye or
 * the centre's owner made. Signing in by phone is one tap away and becomes
 * the easy door once text messages are wired up.
 *
 * One question per screen. The code step does not show the number box again,
 * and the email form does not sit beside the phone one: two forms at once is
 * two chances to fill in the wrong one.
 */

const ERRORS = new Set(['badPhone', 'wait', 'unreachable', 'failed', 'expired', 'badCode', 'suspended', 'badPassword', 'phoneOff']);

/**
 * `DAHAB_PHONE_SIGN_IN=off` hides the phone door, for a deploy with no SMS
 * gateway yet (the API is then on OTP_TRANSPORT=disabled and would refuse).
 */
const PHONE_SIGN_IN = process.env['DAHAB_PHONE_SIGN_IN'] !== 'off';

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ step?: string; error?: string; method?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const query = await searchParams;
  const t = translator(locale);

  const method = PHONE_SIGN_IN && query.method === 'phone' ? 'phone' : 'email';
  const step = method === 'phone' && query.step === 'code' ? 'code' : 'number';
  const error = query.error !== undefined && ERRORS.has(query.error) ? query.error : null;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,560px)]">
      {/* The picture half: only where there is room for it. */}
      <aside className="relative hidden overflow-hidden bg-c-accent text-c-on-accent lg:flex lg:flex-col lg:justify-between lg:p-12">
        <span className="flex items-center gap-3 text-h3 font-semibold">
          <span className="grid size-11 place-items-center rounded-md border border-current">
            <Icon name="boat" size={24} />
          </span>
          Dahab Focal
        </span>
        <div className="max-w-md">
          <p className="text-displayXL font-semibold">{t('partner.signIn.subtitle')}</p>
          <ul className="mt-8 flex flex-col gap-4 text-bodyL">
            {(['home.storyTitle', 'more.team', 'more.reviews'] as const).map((key) => (
              <li key={key} className="flex items-center gap-3">
                <Icon name="check" size={22} />
                {t(`partner.${key}`)}
              </li>
            ))}
          </ul>
        </div>
        <span className="text-small opacity-80">{t('partner.brand')}</span>
      </aside>

      <main className="flex flex-col px-5 pb-10 pt-6 sm:px-10">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-semibold text-c-text lg:invisible">
            <span className="grid size-9 place-items-center rounded-sm bg-c-accent text-c-on-accent">
              <Icon name="boat" size={20} />
            </span>
            Dahab Focal
          </span>
          <LocaleSwitch current={locale} rest="sign-in" />
        </div>

        <div className="partner-enter mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 py-10">
          <header className="flex flex-col gap-2">
            <span className="grid size-16 place-items-center rounded-lg bg-c-info-bg text-c-info">
              <Icon name={step === 'code' ? 'chat' : method === 'email' ? 'key' : 'phone'} size={32} />
            </span>
            <h1 className="mt-2 text-displayL font-semibold text-c-text">
              {step === 'code' ? t('partner.signIn.codeTitle') : t('partner.signIn.title')}
            </h1>
            <p className="text-bodyL text-c-muted">
              {step === 'code' ? t('partner.signIn.codeHint') : t('partner.signIn.subtitle')}
            </p>
          </header>

          {error === null ? null : <Notice tone="danger" title={t(`partner.signIn.error.${error}`)} />}

          {method === 'email' ? (
            <>
              <form action={passwordSignIn} className="flex flex-col gap-4">
                <input type="hidden" name="locale" value={locale} />
                <Field
                  name="identifier"
                  label={t('partner.signIn.identifier')}
                  hint={t('partner.signIn.identifierHint')}
                  autoComplete="username"
                  ltr
                  required
                />
                <PasswordField
                  name="password"
                  label={t('partner.signIn.password')}
                  autoComplete="current-password"
                  showLabel={t('partner.signIn.show')}
                  hideLabel={t('partner.signIn.hide')}
                  required
                />
                <Button type="submit" intent="primary" icon="key" block>
                  {t('partner.signIn.verify')}
                </Button>
              </form>
              {PHONE_SIGN_IN ? (
                <Link
                  href={`/${locale}/sign-in?method=phone` as Route}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md text-body font-semibold text-c-link hover:bg-c-raised"
                >
                  <Icon name="phone" size={18} />
                  {t('partner.signIn.usePhone')}
                </Link>
              ) : null}
              <p className="text-center text-small text-c-muted">{t('partner.signIn.forgot')}</p>
            </>
          ) : step === 'code' ? (
            <>
              <form action={verifyCode} className="flex flex-col gap-4">
                <input type="hidden" name="locale" value={locale} />
                <Field
                  name="code"
                  label={t('partner.signIn.codeLabel')}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={9}
                  placeholder="• • • • • •"
                  ltr
                  required
                />
                <Button type="submit" intent="primary" icon="check" block>
                  {t('partner.signIn.verify')}
                </Button>
              </form>
              <form action={changeNumber}>
                <input type="hidden" name="locale" value={locale} />
                <Button type="submit" intent="quiet" icon="reverse" block>
                  {t('partner.signIn.changeNumber')}
                </Button>
              </form>
            </>
          ) : (
            <>
              <form action={sendCode} className="flex flex-col gap-4">
                <input type="hidden" name="locale" value={locale} />
                <Field
                  name="phone"
                  type="tel"
                  label={t('partner.signIn.phoneLabel')}
                  hint={t('partner.signIn.phoneHint')}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="010 1234 5678"
                  ltr
                  required
                />
                <Button type="submit" intent="primary" icon="chat" block>
                  {t('partner.signIn.send')}
                </Button>
              </form>
              <Link
                href={`/${locale}/sign-in` as Route}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md text-body font-semibold text-c-link hover:bg-c-raised"
              >
                <Icon name="key" size={18} />
                {t('partner.signIn.useEmail')}
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
