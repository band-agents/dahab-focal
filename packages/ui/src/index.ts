/**
 * @dahab/ui — the cross-platform component library.
 *
 * Every component is typed against the token unions in @dahab/tokens, renders
 * in light and Night Dive, in LTR and RTL, and ships every interaction state.
 */
export {
  ThemeProvider,
  useTheme,
  useDirection,
  useIsRTL,
  useScript,
  useDisplayFontClass,
  useBodyFontClass,
  type ThemeName,
  type Direction,
  type Script,
  type ThemeProviderProps,
} from './theme';

export { Mark, Illo, CategoryMark } from './marks/Mark';
export type { MarkProps } from './marks/Mark';

export { MARKS, ILLOS, CATEGORY_MARKS } from '@dahab/tokens/marks';
export type {
  MarkGlyph,
  MarkName,
  MarkTint,
  IlloName,
  CategoryMarkName,
} from '@dahab/tokens/marks';

export { StatusPill } from './primitives/StatusPill';
export type { StatusPillProps, StatusTone } from './primitives/StatusPill';

export { Button } from './primitives/Button';
export type { ButtonProps, ButtonVariant } from './primitives/Button';

export { Card, Row } from './primitives/Card';
export type { CardProps, RowProps } from './primitives/Card';

export {
  curves,
  durations,
  durationMs,
  useReducedMotion,
  withReducedMotion,
  REDUCED_MOTION_FALLBACK,
} from './motion';
