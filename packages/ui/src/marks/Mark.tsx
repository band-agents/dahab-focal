import Svg, { G, Path } from 'react-native-svg';

import { CATEGORY_MARKS, ILLOS, MARKS } from '@dahab/tokens/marks';
import type { CategoryMarkName, IlloName, MarkGlyph, MarkName } from '@dahab/tokens/marks';
import { colors } from '@dahab/tokens/theme';

import { useDirection, useTheme } from '../theme';

/**
 * The mark, drawn one way — the React Native half.
 *
 * Same construction as the web component and the same source data: a 100-unit
 * viewBox, the family-tint silhouette offset +4/+4, the ink-line stroked over
 * it. The two implementations exist because the runtimes do, not because the
 * rule differs; both read @dahab/tokens/marks, so a regenerated board reaches
 * every surface at once.
 *
 * Colours resolve through the generated theme object rather than CSS custom
 * properties, since React Native has none.
 */

const DENSE_SIZE_THRESHOLD = 24;
const LINE_WEIGHT = 3;
const LINE_WEIGHT_DENSE = 4.6;
const SHAPE_OFFSET = 4;

export interface MarkProps {
  readonly size?: number;
  /**
   * Physical objects and media controls keep their orientation in RTL;
   * everything else mirrors with the layout. Unlike the web, React Native
   * does not mirror an SVG for us either way, so this is applied explicitly.
   */
  readonly noFlip?: boolean;
  /** Decorative by default. Give a label only when the mark carries meaning alone. */
  readonly label?: string;
}

interface GlyphProps extends MarkProps {
  readonly glyph: MarkGlyph;
}

function Glyph({ glyph, size = 24, noFlip = false, label }: GlyphProps) {
  const themeName = useTheme();
  const direction = useDirection();
  const palette: Record<string, string> =
    themeName === 'dark' ? { ...colors.light, ...colors.dark } : colors.light;

  const strokeWidth = size <= DENSE_SIZE_THRESHOLD ? LINE_WEIGHT_DENSE : LINE_WEIGHT;
  const mirrored = direction === 'rtl' && !noFlip;

  // `line` inverts to cream in Night Dive; the tint dims. Both come from the
  // token package, so neither is decided here.
  const line = palette['line'] ?? palette['text'] ?? colors.light['ink-line'];
  const tint = palette[glyph.tint] ?? colors.light[glyph.tint];

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityRole={label === undefined ? 'none' : 'image'}
      {...(label === undefined ? null : { accessibilityLabel: label })}
      {...(mirrored ? { style: { transform: [{ scaleX: -1 as const }] } } : null)}
    >
      {/*
        A transform string rather than translateX/translateY props: the web
        build of react-native-svg passes those straight through to the DOM,
        where React rejects them as unknown attributes.
      */}
      {glyph.shape === '' ? null : (
        <G transform={`translate(${SHAPE_OFFSET} ${SHAPE_OFFSET})`}>
          <Path d={glyph.shape} fill={tint} />
        </G>
      )}
      <Path
        d={glyph.d}
        stroke={line}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function Mark({ name, ...rest }: MarkProps & { readonly name: MarkName }) {
  return <Glyph glyph={MARKS[name]} {...rest} />;
}

/** The same hand, drawn larger. Empty states and detail headers. */
export function Illo({ name, size = 96, ...rest }: MarkProps & { readonly name: IlloName }) {
  return <Glyph glyph={ILLOS[name]} size={size} {...rest} />;
}

export function CategoryMark({
  name,
  ...rest
}: MarkProps & { readonly name: CategoryMarkName }) {
  return <Glyph glyph={CATEGORY_MARKS[name]} {...rest} />;
}
