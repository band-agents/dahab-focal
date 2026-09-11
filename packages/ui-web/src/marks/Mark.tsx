/**
 * The mark, drawn one way.
 *
 * A 100-unit viewBox; the family-tint silhouette filled and offset +4/+4
 * down-right; the ink-line path stroked over it with round caps and joins.
 * Abstract marks carry no silhouette. This component is the only place that
 * construction is expressed, so a surface cannot get it subtly wrong.
 *
 * Line weight follows the design system's own rule: 3 at the 100-unit grid,
 * thickening to 4.6 at 24px and below so the mark survives at rail and table
 * size. Nothing else changes with size.
 */
import type { CSSProperties, SVGProps } from 'react';

import { MARKS, ILLOS, CATEGORY_MARKS } from '@dahab/tokens/marks';
import type { IlloName, MarkGlyph, MarkName, CategoryMarkName } from '@dahab/tokens/marks';

/** Below this pixel size the line thickens so it does not disappear. */
const DENSE_SIZE_THRESHOLD = 24;
const LINE_WEIGHT = 3;
const LINE_WEIGHT_DENSE = 4.6;
const SHAPE_OFFSET = 4;

export interface MarkProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  /** Rendered size in px. Drives nothing but the box and the line weight. */
  readonly size?: number;
  /**
   * Physical objects and media controls keep their orientation in RTL; every
   * other mark mirrors with the layout. Defaults to mirroring.
   */
  readonly noFlip?: boolean;
  /** Decorative by default: give a label only when the mark carries meaning alone. */
  readonly label?: string;
}

interface GlyphProps extends MarkProps {
  readonly glyph: MarkGlyph;
}

function Glyph({ glyph, size = 24, noFlip = false, label, style, ...rest }: GlyphProps) {
  const strokeWidth = size <= DENSE_SIZE_THRESHOLD ? LINE_WEIGHT_DENSE : LINE_WEIGHT;
  const decorative = label === undefined;

  // An SVG does not mirror on its own when the layout does, so mirroring is
  // the transform and `noFlip` is its absence — not the other way round.
  // `--mark-flip` is -1 under [dir='rtl'] and 1 everywhere else.
  const svgStyle: CSSProperties = {
    ...style,
    ...(noFlip ? null : { transform: 'scaleX(var(--mark-flip, 1))' }),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={label}
      focusable="false"
      style={svgStyle}
      {...rest}
    >
      {glyph.shape === '' ? null : (
        <g transform={`translate(${SHAPE_OFFSET} ${SHAPE_OFFSET})`}>
          <path d={glyph.shape} fill={`var(--color-${glyph.tint})`} />
        </g>
      )}
      <path
        d={glyph.d}
        stroke="var(--color-line)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export interface NamedMarkProps extends MarkProps {
  readonly name: MarkName;
}

/** One of the 37 marks. */
export function Mark({ name, ...rest }: NamedMarkProps) {
  return <Glyph glyph={MARKS[name]} {...rest} />;
}

export interface IlloProps extends MarkProps {
  readonly name: IlloName;
}

/** One of the 6 illustrations — the same hand, drawn larger. */
export function Illo({ name, size = 96, ...rest }: IlloProps) {
  return <Glyph glyph={ILLOS[name]} size={size} {...rest} />;
}

export interface CategoryMarkProps extends MarkProps {
  readonly name: CategoryMarkName;
}

/** One of the 12 category marks. */
export function CategoryMark({ name, ...rest }: CategoryMarkProps) {
  return <Glyph glyph={CATEGORY_MARKS[name]} {...rest} />;
}
