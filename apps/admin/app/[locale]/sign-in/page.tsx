import type { Metadata } from 'next';

import { Action, Banner, Icon } from '@/components/console';
import { resolveLocale } from '@/components/ConsoleShell';
import { translator } from '@/lib/i18n';

import { signIn } from './actions';

export const metadata: Metadata = {
  title: 'Sign in · Sky Eye',
};

/**
 * Never prerendered either: it reads the error and `next` from the query
 * string, and a cached copy of this page is a cached copy of someone else's
 * failed attempt.
 */
export const dynamic = 'force-dynamic';

/**
 * The console's sign-in.
 *
 * Deliberately a plain server-rendered form posting to a Server Action: this
 * is the screen an operator reaches when something else is broken, and it
 * works with no JavaScript, no client bundle and no hydration.
 *
 * The page is the same Daylight ground as every board, with the same rail
 * identity block, so signing in does not feel like a different product. It
 * used to be cream and blush — the traveller palette — which meant the first
 * screen anyone saw promised a holiday booking app and then opened a console.
 */
export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const { error, next } = await searchParams;
  const t = translator(locale);

  const field =
    'min-h-11 w-full rounded-c-sm border border-c-edge-strong bg-c-surface px-3 font-console text-cBody text-c-text placeholder:text-c-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-focus';

  return (
    <main className="grid min-h-screen place-items-center bg-c-bg px-4 py-10 font-console">
      <div className="w-full max-w-[26rem]">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-c-sm bg-c-accent text-c-on-accent">
            <Icon name="pin" size={19} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-cHeading text-c-text">{t('admin.console')}</span>
            <span className="block truncate text-cMeta text-c-muted">
              {t('admin.consoleSub')}
            </span>
          </span>
        </div>

        <h1 className="mt-7 text-cTitle text-c-text">{t('admin.signIn.title')}</h1>
        <p className="mt-1 text-cBody text-c-muted">{t('admin.signIn.subtitle')}</p>

        {error === undefined ? null : (
          <div
            // Announced, not merely coloured: status is never colour alone, so
            // the strip carries an icon and a sentence as well as its tint.
            role="alert"
            className="mt-5"
          >
            <Banner
              tone="danger"
              title={t(
                error === 'unreachable' ? 'admin.signIn.unreachable' : 'admin.signIn.invalid',
              )}
            />
          </div>
        )}

        <form action={signIn} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          {next === undefined ? null : <input type="hidden" name="next" value={next} />}

          <label className="flex flex-col gap-1.5">
            <span className="text-cLabel text-c-text">{t('admin.signIn.email')}</span>
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              // Latin left-to-right even on an Arabic page: an address is not
              // prose, and the bidi algorithm reorders one that is not isolated.
              dir="ltr"
              className={field}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-cLabel text-c-text">{t('admin.signIn.password')}</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              dir="ltr"
              className={field}
            />
          </label>

          <Action type="submit" intent="primary" icon="chevronEnd" block>
            {t('admin.signIn.submit')}
          </Action>
        </form>

        <p className="mt-5 text-cMeta text-c-muted">{t('admin.signIn.noSelfServe')}</p>
      </div>
    </main>
  );
}
