import type { ReactNode } from 'react';

import { Icon, type IconName } from './Icon';

/**
 * A second tap before anything that cannot be undone.
 *
 * The first button only opens a small panel that says what will happen and
 * holds the real button. No dialog, no script: a `<details>` element, so it
 * works on any phone, and a thumb that brushed "Take it down" on a rocking
 * boat has not taken anything down.
 */
export function Confirm({
  label,
  icon = 'trash',
  question,
  children,
}: {
  /** What the first, harmless button says. */
  readonly label: string;
  readonly icon?: IconName;
  /** One sentence saying what will happen. */
  readonly question: string;
  /** The form with the real button. */
  readonly children: ReactNode;
}) {
  return (
    <details className="group">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md px-3 text-body font-semibold text-c-bad hover:bg-c-bad-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-c-focus [&::-webkit-details-marker]:hidden">
        <Icon name={icon} size={18} />
        {label}
      </summary>
      <div className="mt-2 flex flex-col gap-3 rounded-md border border-c-bad bg-c-bad-bg p-4">
        <p className="text-body font-semibold text-c-bad">{question}</p>
        {children}
      </div>
    </details>
  );
}
