/**
 * Status, never by colour alone.
 *
 * The design system is explicit: every status carries a colour, a mark AND a
 * word. This component makes that the only way to express one — there is no
 * prop for a bare coloured dot, and the label is required.
 *
 * Ground matters for danger. Section 09 of the design system split the danger
 * token in two: `danger-text` on its own tint, `danger-text-on-cream` on the
 * page ground. `onCream` picks the right one rather than leaving it to the
 * caller's eye.
 */
import type { ReactNode } from 'react';

import { Mark } from '../marks/Mark';
import type { MarkName } from '../marks/data';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface ToneSpec {
  readonly surface: string;
  readonly text: string;
  readonly mark: MarkName;
}

/**
 * Each tone's default mark is chosen from the 37 rather than invented: `eco`
 * reads as healthy, `firstAid` as attention, `SOS` as failure, `chat` as
 * information.
 */
const TONES: Record<StatusTone, ToneSpec> = {
  success: { surface: 'bg-success-surface', text: 'text-success-text', mark: 'eco' },
  warning: { surface: 'bg-warning-surface', text: 'text-warning-text', mark: 'firstAid' },
  danger: { surface: 'bg-danger-surface', text: 'text-danger-text', mark: 'sos' },
  info: { surface: 'bg-info-surface', text: 'text-info-text', mark: 'chat' },
  // Semantic tokens only: the raw ramp steps (cream-100, ink-900) carry no
  // Night Dive value, so a pill built from them stays light on a dark ground.
  neutral: { surface: 'bg-surface-raised', text: 'text-text', mark: 'pass' },
};

export interface StatusPillProps {
  readonly tone: StatusTone;
  /** Required. A status without a word is a status nobody can read. */
  readonly children: ReactNode;
  /** Override the tone's default mark when a more specific one exists. */
  readonly mark?: MarkName;
  /**
   * Set when the pill sits directly on the page ground rather than on a
   * surface, so danger picks `danger-text-on-cream` over `danger-text`.
   */
  readonly onCream?: boolean;
}

export function StatusPill({ tone, children, mark, onCream = false }: StatusPillProps) {
  const spec = TONES[tone];
  const text = tone === 'danger' && onCream ? 'text-danger-text-on-cream' : spec.text;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-pill ps-2 pe-3 py-1 text-small ${spec.surface} ${text}`}
    >
      <Mark name={mark ?? spec.mark} size={16} />
      {children}
    </span>
  );
}
