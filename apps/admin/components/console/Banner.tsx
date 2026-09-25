/**
 * The one thing on this screen that cannot wait.
 *
 * Reserved for state that is already costing someone something — an expired
 * insurance certificate blocking an operator from publishing, a forecast that
 * will cancel four boats, an API that did not answer so the screen is empty
 * for the wrong reason.
 *
 * It is a banner rather than a toast because none of those clear themselves,
 * and it links rather than explains, because every one of them has a screen
 * where it can actually be dealt with.
 */
import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import { Icon, type IconName } from './Icon';
import type { Tone } from './Pill';

const TONE: Record<Exclude<Tone, 'neutral'>, { readonly className: string; readonly icon: IconName }> =
  {
    danger: { className: 'bg-c-bad-bg text-c-bad', icon: 'alert' },
    warning: { className: 'bg-c-warn-bg text-c-warn', icon: 'clock' },
    success: { className: 'bg-c-ok-bg text-c-ok', icon: 'check' },
    info: { className: 'bg-c-info-bg text-c-info', icon: 'doc' },
  };

export interface BannerProps {
  readonly tone: Exclude<Tone, 'neutral'>;
  readonly icon?: IconName;
  readonly title: ReactNode;
  /** What it means and what happens next — never a restatement of the title. */
  readonly detail?: ReactNode;
  readonly href?: Route;
  readonly actionLabel?: string;
}

export function Banner({ tone, icon, title, detail, href, actionLabel }: BannerProps) {
  const { className, icon: fallback } = TONE[tone];

  const body = (
    <>
      <Icon name={icon ?? fallback} size={20} className="mt-0.5 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block font-console text-cLabel">{title}</span>
        {detail === undefined ? null : (
          <span className="mt-0.5 block font-console text-cMeta opacity-90">{detail}</span>
        )}
        {actionLabel === undefined ? null : (
          <span className="mt-1.5 inline-flex items-center gap-1 font-console text-cMeta font-medium underline">
            {actionLabel}
            <Icon name="chevronEnd" size={13} />
          </span>
        )}
      </span>
    </>
  );

  const shell = `flex items-start gap-3 rounded-c-sm border-s-[3px] px-3.5 py-3 ${className}`;
  // The start border inherits the tone's text colour, so there is no second
  // token to keep in step with it.
  const edge = { borderInlineStartColor: 'currentColor' } as const;

  return href === undefined ? (
    <div className={shell} style={edge}>
      {body}
    </div>
  ) : (
    <Link
      href={href}
      className={`${shell} transition-[filter] hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-focus`}
      style={edge}
    >
      {body}
    </Link>
  );
}
