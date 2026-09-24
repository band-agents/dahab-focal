import type { Route } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { signOut } from '@/app/[locale]/sign-in/actions';
import { Notice } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { Frame, type NavItem } from '@/components/ui/Frame';
import { getMe, getProfile, getReviews } from '@/lib/data';
import { translator } from '@/lib/i18n';
import { DESTINATIONS, TAB_KEYS, path } from '@/lib/nav';
import { resolveLocale } from '@/lib/page';

/**
 * Everything behind sign-in.
 *
 * Who is signed in, and for which operator, is asked of the API on every
 * render rather than trusted from the cookie — so a team member the owner has
 * just removed is shut out on their next tap, not when their token expires.
 *
 * Somebody can sign in with a phone number no operator has added yet: the
 * phone is proven, the account exists, it just is not part of a centre. That
 * is not an error to show them; it is a sentence telling them what to do.
 */
export default async function AppLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);

  const [me, profile, reviews] = await Promise.all([getMe(), getProfile(), getReviews()]);

  if (!me.ok && me.problem.kind === 'unauthorized') {
    redirect(`/${locale}/sign-in` as Route);
  }

  if (!me.ok || !profile.ok) {
    const problem = !me.ok ? me.problem : !profile.ok ? profile.problem : null;
    const notMember = problem?.kind === 'forbidden';
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-5 py-10">
        <Notice
          tone={notMember ? 'info' : 'danger'}
          title={notMember ? t('partner.signIn.notMember') : t('partner.common.unreachable')}
        />
        <form action={signOut}>
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" icon="ban" block>
            {t('partner.account.signOut')}
          </Button>
        </form>
      </main>
    );
  }

  const waiting = reviews.ok ? reviews.data.filter((review) => review.reply === null).length : 0;

  const nav: readonly NavItem[] = DESTINATIONS.map((destination) => ({
    key: destination.key,
    label: t(destination.labelKey),
    icon: destination.icon,
    href: path(locale, destination.path),
    // Reviews waiting for a reply are the one count worth interrupting for:
    // an unanswered complaint is read by every traveller who comes after it.
    ...(destination.key === 'reviews' && waiting > 0 ? { badge: waiting } : {}),
    ...(destination.key === 'more' && waiting > 0 ? { badge: waiting } : {}),
  }));

  return (
    <Frame
      nav={nav}
      tabKeys={TAB_KEYS}
      story={{ label: t('partner.nav.story'), href: path(locale, 'stories/new') }}
      operator={{
        name: profile.data.displayName,
        logoUrl: profile.data.logoUrl,
        homeHref: path(locale, ''),
      }}
      me={{ name: me.data.displayName, avatarUrl: me.data.avatarUrl, href: path(locale, 'account') }}
    >
      {children}
    </Frame>
  );
}
