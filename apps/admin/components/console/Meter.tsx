/**
 * Time left, or seats filled — a figure and the shape of that figure.
 *
 * Expiry is the theme of the whole vendor model: permits, insurance, agency
 * affiliations, staff certifications and tank hydrostatic tests all run out,
 * and the console's job is to show that before it happens. A date alone does
 * not do it — "expires 22 September" reads the same in June as it does the
 * day before. A bar that is nearly empty reads at a glance, on a phone, in
 * sun.
 *
 * The bar is never the only signal: the remaining time is spelled out beside
 * it, and the tone is carried by the caller rather than derived here, because
 * "soon" means 90 days for a CDWS licence and 7 for an insurance certificate.
 */
import type { ReactNode } from 'react';

export type MeterTone = 'success' | 'warning' | 'danger';

const FILL: Record<MeterTone, string> = {
  success: 'bg-c-ok',
  warning: 'bg-c-warn',
  danger: 'bg-c-bad',
};

export interface MeterProps {
  readonly label: ReactNode;
  /** The spoken value: "6 days", "8 of 10 seats". Never omitted. */
  readonly value: ReactNode;
  /** 0–1. Clamped, so a certificate expired ten days ago still draws empty. */
  readonly fraction: number;
  readonly tone: MeterTone;
  /** Announced to assistive tech in place of the bar's geometry. */
  readonly valueText: string;
}

export function Meter({ label, value, fraction, tone, valueText }: MeterProps) {
  const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100);

  return (
    <div className="flex flex-col gap-1.5 px-4 py-3">
      <div className="flex items-baseline gap-3">
        <span className="min-w-0 flex-1 truncate font-console text-cLabel text-c-text">
          {label}
        </span>
        <span className="shrink-0 font-figure text-cFigureSm tabular-nums text-c-muted">
          {value}
        </span>
      </div>
      <div
        role="meter"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={valueText}
        className="h-1 overflow-hidden rounded-c-xs bg-c-raised"
      >
        {/*
          Inline width is the one place a computed number reaches the DOM as
          style: it is data, not a design value, and there is no Tailwind
          class for "8%".
        */}
        <div className={`h-full rounded-c-xs ${FILL[tone]}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
