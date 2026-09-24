import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import { ActiveLink } from './ActiveLink';
import { Avatar } from './Bits';
import { Icon, type IconName } from './Icon';

/**
 * The dashboard's chrome: a tab bar on a phone, a rail on a laptop.
 *
 * Phone first, because that is where a dive centre runs its day — on the boat,
 * at the dock, at the shop counter between customers. Five slots in the tab
 * bar and the middle one is special: a raised button that posts a story,
 * because "show travellers what the sea looks like right now" is the one
 * thing this dashboard most wants done every day, and it should be the
 * easiest thing on the screen to press.
 *
 * Everything that does not fit in the bar is on "More", which is a real page
 * with a sentence under every entry — not a drawer of bare icons.
 */

export interface NavItem {
  readonly key: string;
  readonly label: string;
  readonly icon: IconName;
  readonly href: Route;
  readonly badge?: number;
}

export interface FrameProps {
  /** Every destination, in the order the rail lists them. */
  readonly nav: readonly NavItem[];
  /** The four the phone bar carries, beside the story button. */
  readonly tabKeys: readonly [string, string, string, string];
  readonly story: { readonly label: string; readonly href: Route };
  readonly operator: { readonly name: string; readonly logoUrl: string | null; readonly homeHref: Route };
  readonly me: { readonly name: string | null; readonly avatarUrl: string | null; readonly href: Route };
  readonly children: ReactNode;
}

export function Frame({ nav, tabKeys, story, operator, me, children }: FrameProps) {
  const tabs = tabKeys
    .map((key) => nav.find((item) => item.key === key))
    .filter((item): item is NavItem => item !== undefined);
  const [first, second, third, fourth] = tabs;

  return (
    <div className="min-h-screen bg-c-bg text-c-text">
      {/* ── Rail: laptops and tablets held sideways ─────────────────── */}
      <nav
        aria-label={operator.name}
        className="fixed inset-y-0 start-0 z-20 hidden w-[var(--partner-rail)] flex-col gap-5 overflow-y-auto border-e border-c-edge bg-c-surface px-4 py-5 lg:flex"
      >
        <Link href={operator.homeHref} className="flex items-center gap-3 rounded-md p-1 hover:bg-c-raised">
          <Avatar name={operator.name} url={operator.logoUrl} size={44} square />
          <span className="min-w-0 truncate text-h3 font-semibold">{operator.name}</span>
        </Link>

        <Link
          href={story.href}
          className="flex min-h-[3.25rem] items-center justify-center gap-2 rounded-md bg-c-accent px-4 text-bodyL font-semibold text-c-on-accent hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-focus"
        >
          <Icon name="camera" size={22} />
          {story.label}
        </Link>

        <ul className="flex flex-col gap-1">
          {/* "More" exists for the phone bar; the rail already lists everything. */}
          {nav.filter((item) => item.key !== 'more').map((item) => (
            <li key={item.key}>
              <ActiveLink
                href={item.href}
                exact={item.key === 'home'}
                className="flex min-h-12 items-center gap-3 rounded-md px-3 text-bodyL transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-c-focus"
                activeClassName="bg-c-raised font-semibold text-c-text"
                inactiveClassName="text-c-muted hover:bg-c-raised hover:text-c-text"
              >
                <Icon name={item.icon} size={22} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.badge === undefined || item.badge === 0 ? null : (
                  <span className="rounded-pill bg-c-bad px-2 text-small font-semibold text-c-on-accent">
                    {item.badge}
                  </span>
                )}
              </ActiveLink>
            </li>
          ))}
        </ul>

        <Link
          href={me.href}
          className="mt-auto flex items-center gap-3 rounded-md p-2 hover:bg-c-raised"
        >
          <Avatar name={me.name} url={me.avatarUrl} size={36} />
          <span className="min-w-0 truncate text-body text-c-muted">{me.name ?? ''}</span>
        </Link>
      </nav>

      <div className="lg:ms-[var(--partner-rail)]">
        {/* ── Top bar: phone only — who you are signed in for ───────── */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-c-edge bg-c-surface px-4 py-2.5 lg:hidden">
          <Link href={operator.homeHref} className="flex min-w-0 flex-1 items-center gap-2.5">
            <Avatar name={operator.name} url={operator.logoUrl} size={36} square />
            <span className="truncate text-h3 font-semibold">{operator.name}</span>
          </Link>
          <Link href={me.href} aria-label={me.name ?? ''} className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-c-focus">
            <Avatar name={me.name} url={me.avatarUrl} size={36} />
          </Link>
        </header>

        {/*
          Room at the bottom for the tab bar and the home indicator. Without it
          the last row of every list sits under the bar — exactly the row
          somebody scrolled down to reach.
        */}
        <main
          id="main"
          className="partner-enter mx-auto w-full max-w-[var(--partner-content-max)] px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-4 lg:px-8 lg:pb-12 lg:pt-8"
        >
          {children}
        </main>
      </div>

      {/* ── Tab bar: phones ──────────────────────────────────────────── */}
      <nav
        aria-label={operator.name}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-c-edge bg-c-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end">
          {first === undefined ? null : <Tab item={first} />}
          {second === undefined ? null : <Tab item={second} />}
          {/* The story button: raised out of the bar, the easiest target here. */}
          <Link
            href={story.href}
            className="-mt-5 flex flex-col items-center gap-1 pb-2 focus-visible:outline-none"
          >
            <span className="grid size-14 place-items-center rounded-full bg-c-accent text-c-on-accent shadow-lg ring-4 ring-c-surface">
              <Icon name="camera" size={28} />
            </span>
            <span className="text-caption font-semibold text-c-link">{story.label}</span>
          </Link>
          {third === undefined ? null : <Tab item={third} />}
          {fourth === undefined ? null : <Tab item={fourth} />}
        </div>
      </nav>
    </div>
  );
}

function Tab({ item }: { readonly item: NavItem }) {
  return (
    <ActiveLink
      href={item.href}
      exact={item.key === 'home'}
      className="relative flex min-h-[3.75rem] flex-col items-center justify-center gap-1 px-1 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-c-focus"
      activeClassName="font-semibold text-c-link"
      inactiveClassName="text-c-muted"
    >
      <span className="relative">
        <Icon name={item.icon} size={24} />
        {item.badge === undefined || item.badge === 0 ? null : (
          <span className="absolute -end-2.5 -top-1.5 grid min-w-5 place-items-center rounded-pill bg-c-bad px-1 text-caption font-semibold text-c-on-accent">
            {item.badge}
          </span>
        )}
      </span>
      <span className="max-w-full truncate text-caption">{item.label}</span>
    </ActiveLink>
  );
}
