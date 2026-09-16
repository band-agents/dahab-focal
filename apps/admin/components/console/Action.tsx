/**
 * A console control. A button, or a link that looks like one.
 *
 * There is no colour prop. `intent` names what the control does, and the
 * palette follows from that — so "make this one teal" is not expressible, and
 * a destructive action cannot accidentally be drawn as the primary one.
 *
 * `danger` is not a red primary button. It is a quiet control with danger ink,
 * because suspending an operator should never be the most attractive thing on
 * the screen; the confirmation sheet is where it becomes prominent, next to
 * the reason field that makes it accountable.
 *
 * Minimum height is 44px throughout — the a11y touch target from tokens.json,
 * and non-negotiable on a surface that is mostly used one-handed.
 */
import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import { Icon, type IconName } from './Icon';

export type Intent = 'primary' | 'secondary' | 'danger' | 'quiet';

const INTENT: Record<Intent, string> = {
  primary: 'bg-c-accent text-c-on-accent hover:brightness-110',
  secondary: 'border border-c-edge-strong bg-c-surface text-c-text hover:bg-c-raised',
  danger: 'border border-c-edge-strong bg-c-surface text-c-bad hover:bg-c-bad-bg',
  quiet: 'text-c-muted hover:bg-c-raised hover:text-c-text',
};

const SHELL =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-c-sm px-3.5 font-console text-cLabel transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-focus disabled:pointer-events-none disabled:opacity-50';

interface Common {
  readonly intent?: Intent;
  readonly icon?: IconName;
  readonly children: ReactNode;
  /** Fills the width of its column — the default inside an ActionRow. */
  readonly block?: boolean;
}

export type ActionProps =
  | (Common & { readonly href: Route; readonly type?: never; readonly disabled?: never })
  | (Common & {
      readonly href?: never;
      readonly type?: 'button' | 'submit';
      readonly disabled?: boolean;
    });

export function Action({
  intent = 'secondary',
  icon,
  children,
  block = false,
  ...rest
}: ActionProps) {
  const className = `${SHELL} ${INTENT[intent]}${block ? ' w-full' : ''}`;
  const body = (
    <>
      {icon === undefined ? null : <Icon name={icon} size={17} />}
      {children}
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
    <button type={rest.type ?? 'button'} disabled={rest.disabled} className={className}>
      {body}
    </button>
  );
}

/**
 * The actions that belong to the thing on screen, sitting on the thing rather
 * than on a separate admin page. On a phone they fill the width evenly; from
 * `sm` up they sit at their natural size at the start of the line.
 */
export function ActionRow({ children }: { readonly children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-2 sm:flex sm:flex-wrap">
      {children}
    </div>
  );
}
