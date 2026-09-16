/**
 * A titled block of the console.
 *
 * Border, fill and radius each say "separate object", so they are spent once,
 * on the panel, and never again inside it: rows within a panel are separated
 * by a hairline, not by nested cards. That is the difference between a dense
 * screen you can scan and a screen of boxes.
 *
 * `action` is where a panel points at the screen that owns its subject — the
 * three documents on Today lead to the verification queue. It is optional in
 * the type but rarely absent in practice.
 */
import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import { Icon } from './Icon';

export interface PanelProps {
  readonly title?: string;
  /** A count or a total, shown beside the title in the figure face. */
  readonly figure?: ReactNode;
  readonly action?: { readonly label: string; readonly href: Route };
  readonly children: ReactNode;
  /** Panels whose content already has its own padding — a RecordList. */
  readonly flush?: boolean;
}

export function Panel({ title, figure, action, children, flush = false }: PanelProps) {
  return (
    <section className="overflow-hidden rounded-c-md border border-c-edge bg-c-surface">
      {title === undefined ? null : (
        <header className="flex items-center gap-3 border-b border-c-edge px-4 py-3">
          <h2 className="min-w-0 flex-1 font-console text-cHeading text-c-text">{title}</h2>
          {figure === undefined ? null : (
            <span className="font-figure text-cFigureSm tabular-nums text-c-muted">{figure}</span>
          )}
          {action === undefined ? null : (
            <Link
              href={action.href}
              className="-me-1 inline-flex shrink-0 items-center gap-1 rounded-c-xs px-1 py-0.5 font-console text-cMeta font-medium text-c-link hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-focus"
            >
              {action.label}
              <Icon name="chevronEnd" size={14} />
            </Link>
          )}
        </header>
      )}
      <div className={flush ? '' : 'px-4 py-3'}>{children}</div>
    </section>
  );
}

/**
 * A section eyebrow for content that is not a panel — a run of stat tiles, an
 * action row. Uppercase is a no-op in Arabic, which has no case, so this is
 * quiet rather than absent there and that is the intended behaviour.
 */
export function Overline({ children }: { readonly children: ReactNode }) {
  return (
    <h2 className="px-1 font-console text-cOverline uppercase tracking-[0.09em] text-c-muted">
      {children}
    </h2>
  );
}
