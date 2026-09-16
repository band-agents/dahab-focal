/**
 * The console frame: one rail on a desktop, one tab bar on a phone.
 *
 * The screen this replaces had a 248px rail and no media query anywhere, so on
 * a phone the navigation ate half the viewport before a single row of data was
 * drawn. Roughly everyone who uses these two surfaces — a platform admin in
 * Assalah, an owner at the dock, a guide on the Blue Hole road — is holding a
 * phone, so the phone layout is the one written first here and the rail is the
 * enhancement.
 *
 * Five slots in the tab bar, because a sixth is where thumb reach stops being
 * reliable. Everything past the fifth lives behind "More", which is a real
 * screen rather than a drawer — a drawer hides the shape of the product, and
 * this product has eight sections that a new admin needs to be able to see.
 */
import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import { Icon, type IconName } from './Icon';

export interface NavItem {
  readonly key: string;
  readonly label: string;
  readonly icon: IconName;
  readonly href: Route;
  readonly current: boolean;
  /** A count worth interrupting for: documents waiting, expiring papers. */
  readonly badge?: number;
}

export interface FrameProps {
  /** Every section, in order. The first four plus More reach the tab bar. */
  readonly nav: readonly NavItem[];
  /** The five the tab bar shows, by key. The last should be the More screen. */
  readonly tabKeys: readonly string[];
  readonly consoleName: string;
  readonly title: string;
  readonly subtitle?: string;
  /** Back out of a detail page. Absent on a section's own screen. */
  readonly back?: { readonly href: Route; readonly label: string };
  /** One control in the header — search, or the locale switcher. */
  readonly headerEnd?: ReactNode;
  /** Who is signed in, and the way out. Rail foot on desktop, More on phone. */
  readonly railEnd?: ReactNode;
  readonly children: ReactNode;
}

export function Frame({
  nav,
  tabKeys,
  consoleName,
  title,
  subtitle,
  back,
  headerEnd,
  railEnd,
  children,
}: FrameProps) {
  const tabs = tabKeys
    .map((key) => nav.find((item) => item.key === key))
    .filter((item): item is NavItem => item !== undefined);

  return (
    <div className="min-h-screen bg-c-bg font-console text-c-text">
      {/* ── The rail. Desktop only. ─────────────────────────────────── */}
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
          {nav.map((item) => (
            <li key={item.key}>
              <RailLink item={item} />
            </li>
          ))}
        </ul>

        {railEnd === undefined ? null : (
          <div className="mt-auto border-t border-c-edge pt-4">{railEnd}</div>
        )}
      </nav>

      <div className="lg:ms-[var(--console-rail)]">
        {/* ── Header. Sticky on a phone; it carries the way back. ────── */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-c-edge bg-c-surface px-4 py-3 lg:px-8 lg:py-5">
          {back === undefined ? null : (
            <Link
              href={back.href}
              className="-ms-2 grid size-10 shrink-0 place-items-center rounded-c-sm text-c-muted transition-colors hover:bg-c-raised hover:text-c-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-focus"
            >
              <Icon name="chevronStart" size={22} label={back.label} />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-console text-cTitle text-c-text">{title}</h1>
            {subtitle === undefined ? null : (
              <p className="truncate font-console text-cMeta text-c-muted">{subtitle}</p>
            )}
          </div>
          {headerEnd === undefined ? null : <div className="shrink-0">{headerEnd}</div>}
        </header>

        {/*
          The bottom padding is the tab bar's height plus the home indicator.
          Without it the last row of every list is permanently under the bar —
          which is exactly the row someone scrolled down to reach.
        */}
        <main
          id="main"
          className="mx-auto w-full max-w-[var(--console-content-max)] px-4 py-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:px-8 lg:py-6 lg:pb-10"
        >
          {children}
        </main>
      </div>

      {/* ── The tab bar. Phone and tablet. ──────────────────────────── */}
      <nav
        aria-label={consoleName}
        className="fixed inset-x-0 bottom-0 z-20 grid border-t border-c-edge bg-c-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={item.current ? 'page' : undefined}
            className={`relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-c-focus ${
              item.current ? 'text-c-link' : 'text-c-muted'
            }`}
          >
            <span className="relative">
              <Icon name={item.icon} size={22} />
              {item.badge === undefined || item.badge === 0 ? null : (
                <span className="absolute -end-2 -top-1 grid min-w-4 place-items-center rounded-c-xs bg-c-bad px-1 text-cBadge text-c-on-accent">
                  {item.badge}
                </span>
              )}
            </span>
            <span className="max-w-full truncate text-cTab">
              {item.label}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

function RailLink({ item }: { readonly item: NavItem }) {
  return (
    <Link
      href={item.href}
      aria-current={item.current ? 'page' : undefined}
      className={`flex min-h-10 items-center gap-2.5 rounded-c-sm px-2.5 font-console text-cBody transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-c-focus ${
        item.current
          ? 'bg-c-raised font-medium text-c-text'
          : 'text-c-muted hover:bg-c-raised hover:text-c-text'
      }`}
    >
      <Icon name={item.icon} size={18} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge === undefined || item.badge === 0 ? null : (
        <span className="shrink-0 rounded-c-xs bg-c-bad-bg px-1.5 font-figure text-cFigureSm text-c-bad">
          {item.badge}
        </span>
      )}
    </Link>
  );
}
