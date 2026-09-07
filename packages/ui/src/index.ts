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

export {
  curves,
  durations,
  durationMs,
  useReducedMotion,
  withReducedMotion,
  REDUCED_MOTION_FALLBACK,
} from './motion';
