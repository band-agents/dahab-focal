/**
 * The single source of every visual value.
 *
 * Consumers import from here, never from tokens.json directly, so the
 * generated artefacts stay the only path from source to screen.
 */
export * from './generated/theme';
export type {
  ColorToken,
  FontFamilyToken,
  GradientToken,
  MotionCurve,
  MotionDuration,
  RadiusToken,
  ShadowToken,
  SpaceToken,
  TypeRole,
} from './generated/tokens.d';
