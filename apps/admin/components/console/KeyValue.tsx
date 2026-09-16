/**
 * Label and figure, down a list.
 *
 * The figures stay in the figure face with tabular numerals and end-aligned,
 * so a column of money reads down its own edge — which is the whole reason a
 * payout screen shows gross, commission, fees and net as four separate lines
 * rather than one sentence. An operator asking what they are owed is asking
 * precisely about the difference between those four numbers.
 */
import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import { Icon } from './Icon';

export interface KeyValueProps {
  readonly label: ReactNode;
  readonly value: ReactNode;
  /** A second, quieter line under the label — a date, a reference. */
  readonly note?: ReactNode;
  /** Emphasised: the total, the amount owed, the one that matters. */
  readonly strong?: boolean;
  readonly href?: Route;
}

export function KeyValue({ label, value, note, strong = false, href }: KeyValueProps) {
  const body = (
    <>
      <dt className="min-w-0 flex-1">
        <span className="block font-console text-cBody text-c-muted">{label}</span>
        {note === undefined ? null : (
          <span className="mt-0.5 block font-console text-cMeta text-c-muted">{note}</span>
        )}
      </dt>
      <dd
        className={`m-0 shrink-0 text-end font-figure tabular-nums text-c-text ${
          strong ? 'text-cFigure' : 'text-cFigureSm'
        }`}
      >
        {value}
      </dd>
      {href === undefined ? null : (
        <Icon name="chevronEnd" size={14} className="shrink-0 self-center text-c-muted" />
      )}
    </>
  );

  const shell = 'flex items-baseline gap-4 border-b border-c-edge px-4 py-3 last:border-b-0';

  return href === undefined ? (
    <div className={shell}>{body}</div>
  ) : (
    <Link
      href={href}
      className={`${shell} transition-colors hover:bg-c-raised focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-c-focus`}
    >
      {body}
    </Link>
  );
}

export function KeyValueList({ children }: { readonly children: ReactNode }) {
  return <dl className="m-0">{children}</dl>;
}
