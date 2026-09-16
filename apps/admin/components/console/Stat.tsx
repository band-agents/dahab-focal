/**
 * A figure and what it counts — and, wherever one exists, the screen that
 * figure is about.
 *
 * "Every figure is a door" is the structural rule the console was missing, so
 * a Stat with an `href` renders as a link and a Stat without one renders as a
 * plain tile. A number with nowhere to go should look different from a number
 * you can open, and this is the only place that difference is drawn.
 */
import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import { Icon } from './Icon';
import type { Tone } from './Pill';

export interface StatProps {
  readonly label: string;
  readonly value: ReactNode;
  /** A unit or a qualifier: "of 10", "EGP", "in 6 days". */
  readonly note?: ReactNode;
  readonly href?: Route;
  /** Colours the figure when the number itself is the alarm. */
  readonly tone?: Extract<Tone, 'warning' | 'danger'>;
  /**
   * Takes the whole row on a phone. For money: a formatted total is thirteen
   * tabular characters ("EGP 71,208.50") and a half-width tile leaves 143px
   * of usable inside, so it clipped. A clipped total is worse than a wide
   * tile — it is a number the reader cannot trust.
   */
  readonly wide?: boolean;
}

const TONE_TEXT: Record<'warning' | 'danger', string> = {
  warning: 'text-c-warn',
  danger: 'text-c-bad',
};

export function Stat({ label, value, note, href, tone, wide = false }: StatProps) {
  /*
   * Figure, then label, then note — each on its own line.
   *
   * An earlier version sat the note beside the figure on one baseline, which
   * is fine for "3 · 11 of 38 seats" and breaks the moment the figure is
   * money: "EGP 71,208.50" is thirteen tabular characters, and on a 375px
   * phone it pushed its own note out of the tile. Stacking costs one line and
   * cannot overflow, and `truncate` on the figure means the worst case is a
   * clipped total rather than a number sitting on top of the next tile.
   */
  const body = (
    <>
      <span
        className={`block truncate font-figure text-cFigure tabular-nums ${
          tone === undefined ? 'text-c-text' : TONE_TEXT[tone]
        }`}
      >
        {value}
      </span>
      <span className="mt-1 flex items-center gap-1">
        <span className="min-w-0 truncate font-console text-cMeta text-c-muted">{label}</span>
        {href === undefined ? null : (
          <Icon name="chevronEnd" size={12} className="shrink-0 text-c-muted" />
        )}
      </span>
      {note === undefined ? null : (
        <span className="block truncate font-console text-cMeta text-c-muted opacity-80">
          {note}
        </span>
      )}
    </>
  );

  const shell =
    'flex min-w-0 flex-col rounded-c-sm border border-c-edge bg-c-surface px-3 py-2.5' +
    (wide ? ' col-span-2' : '');

  return href === undefined ? (
    <div className={shell}>{body}</div>
  ) : (
    <Link
      href={href}
      className={`${shell} transition-colors hover:border-c-edge-strong hover:bg-c-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-focus`}
    >
      {body}
    </Link>
  );
}

/**
 * A run of stats.
 *
 * Two across on a phone and four on a desktop, with money taking two columns
 * at every width.
 *
 * The numbers are not a matter of taste. A formatted total is thirteen tabular
 * characters, which measures 143px at the figure size; a six-column desktop
 * grid on the 1041px content column gives each tile 131px of usable inside, so
 * every currency figure on this screen was silently clipped by twelve pixels.
 * Four columns plus a two-column span is what actually fits the widest string
 * the formatter can produce.
 */
export function StatRow({ children }: { readonly children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}
