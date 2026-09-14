import type { Metadata } from 'next';

import { Button, Mark } from '@dahab/ui-web';

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
 * The page is the same cream ground as every board, with the same rail
 * identity block, so signing in does not feel like a different product.
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
    'min-h-11 w-full rounded-input border border-border-strong bg-surface px-4 font-ui text-body text-text placeholder:text-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-6 py-12">
      <div className="w-full max-w-[26rem]">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-md bg-info-surface">
            <Mark name="compass" size={24} noFlip />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-h3 text-text">
              {t('admin.console')}
            </span>
            <span className="block truncate text-caption text-text-muted">
              {t('admin.consoleSub')}
            </span>
          </span>
        </div>

        <h1 className="mt-8 font-display text-displayL text-text">{t('admin.signIn.title')}</h1>
        <p className="mt-1 text-body text-text-muted">{t('admin.signIn.subtitle')}</p>

        {error === undefined ? null : (
          <p
            // Announced, not merely coloured: status is never colour alone, so
            // the strip carries a mark and a sentence as well as its tint.
            role="alert"
            className="mt-6 flex items-start gap-2 rounded-lg bg-danger-surface p-4 font-ui text-small text-danger-text"
          >
            <Mark name="sos" size={20} className="mt-0.5 shrink-0" />
            {t(error === 'unreachable' ? 'admin.signIn.unreachable' : 'admin.signIn.invalid')}
          </p>
        )}

        <form action={signIn} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          {next === undefined ? null : <input type="hidden" name="next" value={next} />}

          <label className="flex flex-col gap-2">
            <span className="font-ui text-small text-text">{t('admin.signIn.email')}</span>
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

          <label className="flex flex-col gap-2">
            <span className="font-ui text-small text-text">{t('admin.signIn.password')}</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              dir="ltr"
              className={field}
            />
          </label>

          <Button type="submit" variant="primary" mark="compass">
            {t('admin.signIn.submit')}
          </Button>
        </form>

        <p className="mt-6 text-caption text-text-muted">{t('admin.signIn.noSelfServe')}</p>
      </div>
    </main>
  );
}
