import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import { Icon, type IconName } from './Icon';

/**
 * The small pieces: a notice, a picture of a person, stars, and what an empty
 * screen says.
 */

type Tone = 'success' | 'warning' | 'danger' | 'info';

const TONE: Record<Tone, { readonly className: string; readonly icon: IconName }> = {
  success: { className: 'bg-c-ok-bg text-c-ok', icon: 'check' },
  warning: { className: 'bg-c-warn-bg text-c-warn', icon: 'clock' },
  danger: { className: 'bg-c-bad-bg text-c-bad', icon: 'alert' },
  info: { className: 'bg-c-info-bg text-c-info', icon: 'doc' },
};

/** Something worth saying once, above the screen. Status is colour, icon and words. */
export function Notice({
  tone,
  title,
  children,
}: {
  readonly tone: Tone;
  readonly title: string;
  readonly children?: ReactNode;
}) {
  const { className, icon } = TONE[tone];
  return (
    <div role="status" className={`flex items-start gap-3 rounded-md px-4 py-3.5 ${className}`}>
      <Icon name={icon} size={22} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-body font-semibold">{title}</p>
        {children === undefined ? null : <div className="mt-0.5 text-body opacity-90">{children}</div>}
      </div>
    </div>
  );
}

/**
 * A person or an operator, as a picture — or their initials on a tint when
 * there is no picture yet, so a list of people never looks like a list of
 * broken images.
 */
export function Avatar({
  name,
  url,
  size = 48,
  square = false,
}: {
  readonly name: string | null;
  readonly url: string | null;
  readonly size?: number;
  /** Operators' logos are square-ish; people are round. */
  readonly square?: boolean;
}) {
  const initials =
    (name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '·';
  const shape = square ? 'rounded-md' : 'rounded-full';
  const style = { width: size, height: size };

  if (url !== null) {
    // A plain <img>: these are user uploads served through our own rewrite,
    // and Next's image optimiser would re-fetch every one of them through a
    // second hop for no gain at these sizes.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" style={style} className={`${shape} shrink-0 border border-c-edge bg-c-raised object-cover`} />;
  }
  return (
    <span
      aria-hidden
      style={{ ...style, fontSize: Math.round(size * 0.38) }}
      className={`${shape} grid shrink-0 place-items-center bg-c-info-bg font-semibold text-c-info`}
    >
      {initials}
    </span>
  );
}

/**
 * A rating out of five, drawn and spoken. The earned stars are solid and the
 * rest are faint outlines: with outlines alone a five and a one look alike.
 */
export function Stars({ value, label }: { readonly value: number; readonly label: string }) {
  const full = Math.round(value);
  return (
    <span role="img" aria-label={label} className="inline-flex items-center gap-0.5 text-c-warn">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" size={18} className={n <= full ? '[&_path]:fill-current' : 'opacity-30'} />
      ))}
    </span>
  );
}

/**
 * What a screen says when there is nothing on it yet. Never a blank page:
 * it says what would be here, and offers the button that puts it there.
 */
export function Empty({
  icon,
  title,
  children,
  action,
}: {
  readonly icon: IconName;
  readonly title: string;
  readonly children?: ReactNode;
  readonly action?: { readonly label: string; readonly href: Route; readonly icon?: IconName };
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-c-info-bg text-c-info">
        <Icon name={icon} size={32} />
      </span>
      <p className="text-h3 font-semibold text-c-text">{title}</p>
      {children === undefined ? null : <p className="max-w-[34ch] text-body text-c-muted">{children}</p>}
      {action === undefined ? null : (
        <Link
          href={action.href}
          className="mt-2 inline-flex min-h-[3.25rem] items-center gap-2 rounded-md bg-c-accent px-5 text-bodyL font-semibold text-c-on-accent hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-focus"
        >
          {action.icon === undefined ? null : <Icon name={action.icon} size={22} />}
          {action.label}
        </Link>
      )}
    </div>
  );
}
