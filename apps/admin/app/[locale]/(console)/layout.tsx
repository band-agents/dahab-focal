import type { Route } from 'next';
import { redirect } from 'next/navigation';

import { isLocale, isolate, type Locale } from '@dahab/i18n/server';

import { signOut } from '@/app/[locale]/sign-in/actions';
import { Action } from '@/components/console';
import { Rail, TabBar, type NavEntry } from '@/components/console/Nav';
import { api, load } from '@/lib/api';
import { translator } from '@/lib/i18n';
import { SECTIONS, hrefFor } from '@/lib/nav';
import { viewer } from '@/lib/viewer';

/**
 * Everything inside this group needs a signed-in operator — and gets the
 * console's navigation, drawn once.
 *
 * The check is structural rather than a line each screen remembers: a new
 * board added under `(console)/` is protected by existing, and one that is
 * meant to be public has to be moved out deliberately.
 *
 * The middleware already turned away anyone with no cookie at all. This is
 * the check that costs a round trip and is worth it — it asks the API who the
 * caller actually is, so a revoked session stops working rather than when its
 * fifteen minutes happen to run out.
 *
 * Only `unauthorized` redirects. An API that is down or a database that is
 * unconfigured must not look like a sign-in problem: the screens below render
 * their own notice, which says which of the two it was.
 *
 * The rail and the tab bar live here rather than in each page. A layout is
 * not re-rendered when somebody taps between the screens under it, so the
 * navigation stays on screen, unblinking, while only the content changes —
 * and a page no longer pays for drawing it, or for asking who is signed in
 * just to print an address in the rail's footer.
 */
export const dynamic = 'force-dynamic';

export default async function ConsoleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : 'en-GB';

  // One round trip for both. The badges come off the same overview the Today
  // screen reads; they refresh whenever a write revalidates the layout.
  const [who, overview] = await Promise.all([
    viewer(),
    load(() => api.admin.overview.query()),
  ]);

  if (!who.ok && who.problem.kind === 'unauthorized') {
    redirect(`/${locale}/sign-in` as Route);
  }

  const t = translator(locale);
  const badges: Readonly<Record<string, number>> = overview.ok
    ? { vendors: overview.data.needsAction, expiry: overview.data.expiringSoon }
    : {};

  const entries: readonly NavEntry[] = SECTIONS.map((section) => {
    const badge = badges[section.key];
    return {
      key: section.key,
      label: t(section.labelKey),
      icon: section.icon,
      href: hrefFor(locale, section),
      segment: section.path,
      tab: section.tab === true,
      ...(badge === undefined || badge === 0 ? {} : { badge }),
    };
  });

  const email = who.ok ? who.viewer.email : null;

  const footer = (
    <div className="flex flex-col gap-2">
      {email === null ? null : (
        <p className="px-2 font-console text-cMeta text-c-muted">
          {/* An address is Latin inside an Arabic sentence; without isolation
              the bidi algorithm moves its parts to the wrong end of the line. */}
          {t('admin.signedInAs', { email: isolate(email) })}
        </p>
      )}
      <form action={signOut}>
        <input type="hidden" name="locale" value={locale} />
        <Action type="submit" intent="quiet" icon="ban" block>
          {t('admin.signOut')}
        </Action>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-c-bg font-console text-c-text">
      <Rail entries={entries} consoleName={t('admin.console')} footer={footer} />
      <div className="lg:ms-[var(--console-rail)]">{children}</div>
      <TabBar entries={entries} consoleName={t('admin.console')} />
    </div>
  );
}
