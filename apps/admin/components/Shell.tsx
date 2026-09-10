/**
 * The console shell — a persistent rail and a quiet top bar.
 *
 * The rail is the only navigation: no top tabs, no breadcrumbs competing with
 * it. Section marks come from the design system's 37 rather than an icon font,
 * and they sit at 24px, where the <Mark> component thickens the line to 4.6 so
 * it survives at rail size.
 */
import type { ReactNode } from 'react';

import { Mark } from '@dahab/ui-web';
import type { MarkName } from '@dahab/ui-web';

export interface NavItem {
  readonly key: string;
  readonly label: string;
  readonly mark: MarkName;
  readonly current?: boolean;
}

export interface ShellProps {
  readonly nav: readonly NavItem[];
  readonly consoleName: string;
  readonly consoleSub: string;
  readonly title: string;
  readonly subtitle: string;
  readonly children: ReactNode;
  /** Top-end of the header — the locale switcher and the signed-in operator. */
  readonly headerEnd?: ReactNode;
}

export function Shell({
  nav,
  consoleName,
  consoleSub,
  title,
  subtitle,
  children,
  headerEnd,
}: ShellProps) {
  return (
    <div className="flex min-h-screen bg-bg">
      <nav
        aria-label={consoleName}
        className="flex w-[var(--admin-rail)] shrink-0 flex-col gap-8 border-e border-border bg-surface px-4 py-6"
      >
        <div className="flex items-center gap-3 px-2">
          {/* `compass` reads as orientation without borrowing another product's eye. */}
          <span className="grid size-11 shrink-0 place-items-center rounded-md bg-info-surface">
            <Mark name="compass" size={24} noFlip />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-h3 text-text">{consoleName}</span>
            <span className="block truncate text-caption text-text-muted">{consoleSub}</span>
          </span>
        </div>

        <ul className="flex flex-col gap-1">
          {nav.map((item) => (
            <li key={item.key}>
              <a
                href="#main"
                aria-current={item.current === true ? 'page' : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-md px-3 font-ui text-body transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
                  item.current === true
                    ? 'bg-surface-raised text-text'
                    : 'text-text-muted hover:bg-surface-raised hover:text-text'
                }`}
              >
                <Mark name={item.mark} size={24} />
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-end justify-between gap-6 border-b border-border px-10 pb-5 pt-8">
          <div className="min-w-0">
            <h1 className="font-display text-displayL text-text">{title}</h1>
            <p className="mt-1 text-body text-text-muted">{subtitle}</p>
          </div>
          {headerEnd === undefined ? null : <div className="shrink-0">{headerEnd}</div>}
        </header>

        <main id="main" className="mx-auto w-full max-w-[var(--admin-content-max)] flex-1 px-10 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
