'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';

import { Icon, type IconName } from './Icon';

/**
 * The console's navigation — the rail on a desktop, the tab bar on a phone.
 *
 * It lives in the layout now, not in each page, and that is most of why the
 * console feels different. A page used to render its own rail and tab bar, so
 * every tap rebuilt both and the bar blinked as the next screen arrived. In
 * the layout they are drawn once and stay put while only the screen beneath
 * them changes — which is what an app does and what a phone user expects.
 *
 * The one thing the layout cannot know is which screen is showing: a layout
 * does not re-render on a soft navigation. So this is a client component that
 * reads the path itself, and the active tab moves the instant the tap lands
 * rather than when the server answers.
 */

export interface NavEntry {
  readonly key: string;
  readonly label: string;
  readonly icon: IconName;
  readonly href: Route;
  /** The path segment under the locale that means "this section". */
  readonly segment: string;
  readonly tab: boolean;
  readonly badge?: number;
}

/** Which section the current path belongs to — the first segment after the locale. */
function currentSegment(pathname: string): string {
  const [, , first = ''] = pathname.split('/');
  return first;
}

export function Rail({
  entries,
  consoleName,
  footer,
}: {
  readonly entries: readonly NavEntry[];
  readonly consoleName: string;
  readonly footer: React.ReactNode;
}) {
  const segment = currentSegment(usePathname());

  return (
    <nav
      aria-label={consoleName}
      className="fixed inset-y-0 start-0 z-20 hidden w-[var(--console-rail)] flex-col gap-6 overflow-y-auto border-e border-c-edge bg-c-surface px-3 py-5 lg:flex"
    >
      <span className="flex items-center gap-2.5 px-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-c-sm bg-c-accent text-c-on-accent">
          <Icon name="pin" size={18} />
        </span>
        <span className="min-w-0 truncate font-console text-cHeading text-c-text">
          {consoleName}
        </span>
      </span>

      <ul className="flex flex-col gap-0.5">
        {entries.map((entry) => {
          const current = entry.segment === segment;
          return (
            <li key={entry.key}>
              <Link
                href={entry.href}
                aria-current={current ? 'page' : undefined}
                className={`flex min-h-10 items-center gap-2.5 rounded-c-sm px-2.5 font-console text-cBody transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-c-focus ${
                  current
                    ? 'bg-c-info-bg font-medium text-c-text'
                    : 'text-c-muted hover:bg-c-raised hover:text-c-text'
                }`}
              >
                <span className={current ? 'text-c-link' : undefined}>
                  <Icon name={entry.icon} size={18} weight={current ? 'bold' : 'regular'} />
                </span>
                <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                {entry.badge === undefined || entry.badge === 0 ? null : (
                  <span className="shrink-0 rounded-c-xs bg-c-bad-bg px-1.5 text-cBadge text-c-bad">
                    {entry.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto border-t border-c-edge pt-4">{footer}</div>
    </nav>
  );
}

/**
 * The phone's tab bar: five slots, floating, frosted.
 *
 * Floating rather than welded to the bottom edge, because a bar that touches
 * the edge sits under the home indicator on every modern phone and competes
 * with the system's own gesture. Frosted so the list scrolling beneath it
 * stays visible as a hint that there is more — a solid bar hides that.
 *
 * A screen that is not one of the five — the expiry board, the ledger's own
 * pages — lights Home, because Home is where it was reached from and where
 * the way back is.
 */
export function TabBar({
  entries,
  consoleName,
}: {
  readonly entries: readonly NavEntry[];
  readonly consoleName: string;
}) {
  const segment = currentSegment(usePathname());
  const tabs = entries.filter((entry) => entry.tab);
  const onATab = tabs.some((entry) => entry.segment === segment);

  return (
    <>
      {/*
        A fade behind the bar. A floating bar leaves a strip of page visible
        below and beside it, and the rows scrolling through that strip read as
        clutter under the navigation. This dissolves the content into the page
        ground before it reaches the bar, which is what makes the bar look like
        it floats over the list rather than being cut out of it.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-28 bg-gradient-to-t from-c-bg from-40% to-transparent lg:hidden"
      />
    <nav
      aria-label={consoleName}
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 lg:hidden"
    >
      <ul
        className="grid rounded-c-lg border border-c-edge bg-c-glass p-1.5 shadow-md backdrop-blur-md"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((entry) => {
          const current = onATab ? entry.segment === segment : entry.key === 'home';
          return (
            <li key={entry.key} className="min-w-0">
              <Link
                href={entry.href}
                aria-current={current ? 'page' : undefined}
                className="group flex min-h-14 flex-col items-center justify-center gap-1 rounded-c-md px-1 transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-c-focus motion-safe:active:scale-95"
              >
                <span
                  className={`relative grid h-7 w-12 place-items-center rounded-full transition-colors duration-200 ${
                    current ? 'bg-c-info-bg text-c-link' : 'text-c-muted group-hover:text-c-text'
                  }`}
                >
                  <Icon name={entry.icon} size={21} weight={current ? 'bold' : 'regular'} />
                  {entry.badge === undefined || entry.badge === 0 ? null : (
                    <span className="absolute -end-0.5 -top-1 grid min-w-4 place-items-center rounded-full bg-c-bad px-1 text-cBadge text-c-on-accent ring-2 ring-c-surface">
                      {entry.badge}
                    </span>
                  )}
                </span>
                <span
                  className={`max-w-full truncate text-cTab ${
                    current ? 'font-medium text-c-text' : 'text-c-muted'
                  }`}
                >
                  {entry.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
    </>
  );
}
