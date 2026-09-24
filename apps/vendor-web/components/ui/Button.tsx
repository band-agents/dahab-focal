import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import { Icon, type IconName } from './Icon';

/**
 * A button, or a link that looks like one.
 *
 * Three rules this dashboard's buttons keep, because the people pressing them
 * are running a dive centre and are not here to learn software:
 *
 *   - **A word, always.** An icon on its own is a guess. Every button says
 *     what it does, and the icon is there to be recognised the second time.
 *   - **Big.** 52px tall at the least — a thumb on a boat, not a mouse.
 *   - **The dangerous one is never the pretty one.** `danger` is quiet ink on a
 *     plain ground; the accent fill is reserved for the thing you most likely
 *     came to do.
 *
 * There is no colour prop. `intent` says what the button is for and the colour
 * follows from that.
 */

export type Intent = 'primary' | 'secondary' | 'danger' | 'quiet';

const INTENT: Record<Intent, string> = {
  primary: 'bg-c-accent text-c-on-accent hover:brightness-110',
  secondary: 'border border-c-edge-strong bg-c-surface text-c-text hover:bg-c-raised',
  danger: 'border border-c-edge-strong bg-c-surface text-c-bad hover:bg-c-bad-bg',
  quiet: 'text-c-link hover:bg-c-raised',
};

const SHELL =
  'inline-flex min-h-[3.25rem] items-center justify-center gap-2.5 rounded-md px-5 font-console text-bodyL font-semibold transition-[background-color,filter] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-focus disabled:pointer-events-none disabled:opacity-50';

interface Common {
  readonly intent?: Intent;
  readonly icon?: IconName;
  readonly children: ReactNode;
  /** Takes the full width — the default for the main action of a screen. */
  readonly block?: boolean;
}

export type ButtonProps =
  | (Common & { readonly href: Route; readonly type?: never; readonly name?: never; readonly value?: never; readonly disabled?: never })
  | (Common & {
      readonly href?: never;
      readonly type?: 'button' | 'submit';
      readonly name?: string;
      readonly value?: string;
      readonly disabled?: boolean;
    });

export function Button({ intent = 'secondary', icon, children, block = false, ...rest }: ButtonProps) {
  const className = `${SHELL} ${INTENT[intent]}${block ? ' w-full' : ''}`;
  const body = (
    <>
      {icon === undefined ? null : <Icon name={icon} size={22} />}
      <span>{children}</span>
    </>
  );

  if (rest.href !== undefined) {
    return (
      <Link href={rest.href} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <button
      type={rest.type ?? 'button'}
      name={rest.name}
      value={rest.value}
      disabled={rest.disabled}
      className={className}
    >
      {body}
    </button>
  );
}
