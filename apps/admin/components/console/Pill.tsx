/**
 * A status, stated three ways at once: colour, icon and word.
 *
 * Accessibility is a build gate here (CLAUDE.md), and "status is never colour
 * alone" is the rule this component exists to make unbreakable — there is no
 * prop that produces a bare dot, and the word is `children`, so a Pill with
 * nothing to say cannot be rendered.
 */
import type { ReactNode } from 'react';

import { Icon, type IconName } from './Icon';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONE: Record<Tone, { readonly className: string; readonly icon: IconName }> = {
  success: { className: 'bg-c-ok-bg text-c-ok', icon: 'check' },
  warning: { className: 'bg-c-warn-bg text-c-warn', icon: 'clock' },
  danger: { className: 'bg-c-bad-bg text-c-bad', icon: 'alert' },
  info: { className: 'bg-c-info-bg text-c-info', icon: 'doc' },
  neutral: { className: 'bg-c-raised text-c-muted', icon: 'doc' },
};

export interface PillProps {
  readonly tone: Tone;
  /** Overrides the tone's default icon where the domain has a better one. */
  readonly icon?: IconName;
  readonly children: ReactNode;
}

export function Pill({ tone, icon, children }: PillProps) {
  const { className, icon: fallback } = TONE[tone];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-c-xs px-2 py-1 font-console text-cMeta font-medium ${className}`}
    >
      <Icon name={icon ?? fallback} size={13} />
      {children}
    </span>
  );
}
