/**
 * The button.
 *
 * The design system's hardest rule lives here: the primary button is a
 * blush-200 fill with an ink-900 label, and white-on-fill is 1.4:1. The API
 * makes that impossible to express rather than merely discouraged — there is
 * no colour prop, and the three variants are the only three that exist.
 *
 * Every variant is at least 44px tall with a 2px lagoon-focus ring at 2px
 * offset, so the accessibility floor is not a caller's responsibility.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Mark } from '../marks/Mark';
import type { MarkName } from '@dahab/tokens/marks';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-cta-fill text-cta-label border border-cta-edge hover:bg-cta-fill-pressed',
  // Outline-on-page, not lagoon-on-mint: that pair computes 4.29 against a 4.5
  // bar and is one of the design system's four open gaps.
  secondary: 'bg-surface text-text border border-border-strong hover:bg-surface-raised',
  ghost: 'bg-transparent text-text-link border border-transparent hover:bg-surface-raised',
};

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  readonly variant?: ButtonVariant;
  readonly children: ReactNode;
  readonly mark?: MarkName;
  /** Renders the label for screen readers only, for icon-only controls. */
  readonly iconOnly?: boolean;
}

export function Button({
  variant = 'secondary',
  children,
  mark,
  iconOnly = false,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-input px-4 font-ui text-body transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:opacity-50 ${VARIANTS[variant]}`}
      {...rest}
    >
      {mark === undefined ? null : <Mark name={mark} size={20} />}
      {iconOnly ? <span className="sr-only">{children}</span> : children}
    </button>
  );
}
