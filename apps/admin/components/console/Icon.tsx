/**
 * The only place the console icon construction rule is expressed.
 *
 * One stroke, 1.75 units on a 24 grid, round caps and joins, `currentColor`,
 * no fill. Nothing else in the console may draw an inline <svg>.
 *
 * Unlike <Mark>, the stroke does not thicken as the icon shrinks. It does not
 * need to: a mark is a line over a filled silhouette and loses the shape
 * first, while a bare stroke scales with its own viewBox and keeps its
 * proportion all the way down to 16px.
 *
 * Mirroring reads `--mark-flip`, the same custom property the traveller
 * <Mark> uses, so direction is declared once per document rather than per
 * component — but only icons whose data says `directional` consume it.
 */
import { ICONS, type IconName, type IconShape } from './icons';

export type { IconName };

export interface IconProps {
  readonly name: IconName;
  /** 16–20 in a row, 24 in a header, 32+ only in an empty state. */
  readonly size?: number;
  /**
   * Icons sit beside a word almost everywhere here, so they are hidden from
   * assistive tech unless given a label. If an icon is the only content of a
   * control, pass one — and if you are reaching for that, check first whether
   * the control should carry a visible word instead.
   */
  readonly label?: string;
  readonly className?: string;
  /**
   * `bold` for the one icon that says "you are here" — the active tab. The
   * shape is the same drawing; only the line is heavier, so the active state
   * reads at a glance without a second icon set to keep in step.
   */
  readonly weight?: 'regular' | 'bold';
}

export function Icon({ name, size = 20, label, className, weight = 'regular' }: IconProps) {
  const shape: IconShape = ICONS[name];
  const labelled = label !== undefined;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={shape.directional === true ? { transform: 'scaleX(var(--mark-flip, 1))' } : undefined}
      role={labelled ? 'img' : undefined}
      aria-label={label}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
    >
      <path
        d={shape.d}
        fill="none"
        stroke="currentColor"
        strokeWidth={weight === 'bold' ? 2.25 : 1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
