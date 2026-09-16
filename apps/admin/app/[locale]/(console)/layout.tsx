import type { Route } from 'next';
import { redirect } from 'next/navigation';

import { isLocale } from '@dahab/i18n/server';

import { viewer } from '@/lib/viewer';

/**
 * Everything inside this group needs a signed-in operator.
 *
 * The check is structural rather than a line each screen remembers: a new
 * board added under `(console)/` is protected by existing, and one that is
 * meant to be public has to be moved out deliberately.
 *
 * The middleware already turned away anyone with no cookie at all. This is
 * the check that costs a round trip and is worth it — it asks the API who the
 * caller actually is, so a revoked session stops working on the next page view
 * rather than when its fifteen minutes happen to run out.
 *
 * Only `unauthorized` redirects. An API that is down or a database that is
 * unconfigured must not look like a sign-in problem: the screens below render
 * their own `DataProblemNotice`, which says which of the two it was.
 */
/**
 * Never prerendered.
 *
 * Two reasons, either of which alone would be enough. Every board reads live
 * rows — a departure's seat count baked at build time is a lie by the time
 * anyone reads it. And the session check below is per request by definition:
 * a statically rendered page has no caller to check.
 */
export const dynamic = 'force-dynamic';

export default async function ConsoleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Cached for the render, so the shell's "signed in as" reuses this answer
  // rather than asking the API the same question a second time.
  const result = await viewer();

  if (!result.ok && result.problem.kind === 'unauthorized') {
    // typedRoutes cannot prove a template literal is a real route; the locale
    // is validated on the line above, which is the part that actually matters.
    redirect(`/${isLocale(locale) ? locale : 'en-GB'}/sign-in` as Route);
  }

  return <>{children}</>;
}
