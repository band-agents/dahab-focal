import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import { Icon } from './Icon';

/**
 * The top of every screen: where you are, and the way back up.
 *
 * The breadcrumb and the back button are the same fact drawn twice, for two
 * kinds of reader. The trail says where this screen sits — Home › Operators —
 * and each step is a link. The back button is the step immediately above,
 * made thumb-sized, because on a phone that is the one somebody reaches for.
 *
 * "Back" here means up, not browser history. Somebody who arrived at an
 * operator from a push link, a bookmark or a search has no history to go back
 * through, and a back button that does nothing — or leaves the console — is
 * worse than none. Up is always somewhere.
 *
 * Sticky and frosted, so the way out is on screen at every scroll depth and
 * the content passing under it stays faintly visible rather than cut off.
 */

export interface Crumb {
  readonly label: string;
  readonly href: Route;
}

export interface PageHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  /** Every level above this one, outermost first. The last is where back goes. */
  readonly crumbs: readonly Crumb[];
  readonly backLabel: string;
  readonly trailLabel: string;
  readonly end?: ReactNode;
}

export function PageHeader({ title, subtitle, crumbs, backLabel, trailLabel, end }: PageHeaderProps) {
  const up = crumbs.at(-1);

  return (
    <header className="sticky top-0 z-20 border-b border-c-edge bg-c-glass backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[var(--console-content-max)] items-start gap-2 px-3 pb-3 pt-2.5 lg:px-8 lg:pb-4 lg:pt-4">
        {up === undefined ? null : (
          <Link
            href={up.href}
            className="mt-3 grid size-10 shrink-0 place-items-center rounded-full text-c-text transition-colors hover:bg-c-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-focus motion-safe:active:scale-95 lg:mt-4"
          >
            <Icon name="chevronStart" size={22} weight="bold" label={`${backLabel}: ${up.label}`} />
          </Link>
        )}

        <div className={`min-w-0 flex-1 ${up === undefined ? 'ps-1' : ''}`}>
          {crumbs.length === 0 ? null : (
            <nav aria-label={trailLabel}>
              <ol className="flex min-w-0 items-center gap-1 overflow-hidden font-console text-cMeta text-c-muted">
                {crumbs.map((crumb, index) => (
                  <li key={crumb.href} className="flex min-w-0 items-center gap-1">
                    {index === 0 ? null : (
                      <Icon name="chevronEnd" size={12} className="shrink-0 opacity-60" />
                    )}
                    <Link
                      href={crumb.href}
                      /*
                       * The outer crumbs shrink first. On a 375px phone the
                       * trail Home › Operators › Fanous Divers has to fit on
                       * one line above the title, and the step nearest the
                       * reader is the one worth keeping readable.
                       */
                      className={`truncate rounded-c-xs hover:text-c-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-c-focus ${
                        index === crumbs.length - 1 ? 'shrink-0' : 'min-w-0'
                      }`}
                    >
                      {crumb.label}
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <h1 className="mt-0.5 truncate font-console text-cTitle text-c-text">{title}</h1>
          {subtitle === undefined ? null : (
            <p className="truncate font-console text-cMeta text-c-muted">{subtitle}</p>
          )}
        </div>

        {end === undefined ? null : <div className="mt-3 shrink-0 lg:mt-4">{end}</div>}
      </div>
    </header>
  );
}
