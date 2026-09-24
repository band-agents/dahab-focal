import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import { Icon, type IconName } from './Icon';

/**
 * The surfaces a screen is built from.
 *
 * `Card` is one thing with a title. `Tile` is one thing you tap to go
 * somewhere — a big target with an icon, a name and one sentence saying what
 * is behind it, because "Team" alone does not tell a first-time user whether
 * that is where they add a guide.
 */

export function Card({
  title,
  icon,
  action,
  children,
  flush = false,
}: {
  readonly title?: string;
  readonly icon?: IconName;
  readonly action?: { readonly label: string; readonly href: Route };
  readonly children: ReactNode;
  /** For content that brings its own padding — a list of rows. */
  readonly flush?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-c-edge bg-c-surface">
      {title === undefined ? null : (
        <header className="flex items-center gap-3 px-5 pb-1 pt-4">
          {icon === undefined ? null : (
            <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-c-info-bg text-c-info">
              <Icon name={icon} size={20} />
            </span>
          )}
          <h2 className="min-w-0 flex-1 text-h3 font-semibold text-c-text">{title}</h2>
          {action === undefined ? null : (
            <Link
              href={action.href}
              className="inline-flex min-h-11 items-center gap-1 rounded-sm px-2 text-body font-semibold text-c-link hover:bg-c-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-c-focus"
            >
              {action.label}
              <Icon name="chevronEnd" size={16} />
            </Link>
          )}
        </header>
      )}
      <div className={flush ? '' : 'px-5 pb-5 pt-3'}>{children}</div>
    </section>
  );
}

export function Tile({
  href,
  icon,
  title,
  description,
  badge,
  tone = 'plain',
}: {
  readonly href: Route;
  readonly icon: IconName;
  readonly title: string;
  readonly description: string;
  /** A count worth noticing: reviews waiting, papers expiring. */
  readonly badge?: string;
  /** `accent` for the one tile a screen most wants you to press. */
  readonly tone?: 'plain' | 'accent';
}) {
  const accent = tone === 'accent';
  return (
    <Link
      href={href}
      className={`group flex min-h-[5.5rem] items-center gap-4 rounded-lg border p-4 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-focus ${
        accent
          ? 'border-transparent bg-c-accent text-c-on-accent hover:brightness-110'
          : 'border-c-edge bg-c-surface text-c-text hover:border-c-edge-strong hover:bg-c-raised'
      }`}
    >
      <span
        className={`grid size-12 shrink-0 place-items-center rounded-md ${
          accent ? 'bg-white/15' : 'bg-c-info-bg text-c-info'
        }`}
      >
        <Icon name={icon} size={26} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-h3 font-semibold">{title}</span>
          {badge === undefined ? null : (
            <span
              className={`rounded-pill px-2 text-small font-semibold ${
                accent ? 'bg-white/20' : 'bg-c-bad-bg text-c-bad'
              }`}
            >
              {badge}
            </span>
          )}
        </span>
        <span className={`mt-0.5 block text-body ${accent ? 'opacity-90' : 'text-c-muted'}`}>
          {description}
        </span>
      </span>
      <Icon name="chevronEnd" size={20} className={accent ? 'opacity-80' : 'text-c-muted'} />
    </Link>
  );
}

/** A heading between groups of cards. Uppercase is a no-op in Arabic, by design. */
export function SectionTitle({ children }: { readonly children: ReactNode }) {
  return <h2 className="px-1 pt-2 text-h3 font-semibold text-c-text">{children}</h2>;
}
