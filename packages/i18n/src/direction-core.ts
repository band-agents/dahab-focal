/**
 * Direction helpers that do not need React.
 *
 * Split out of `direction.ts` so a React Server Component — and the API, and
 * any Node script — can ask direction questions without importing
 * `react-i18next`, whose module body calls `createContext()` at import time
 * and throws outside a client bundle.
 *
 * The hooks live next door in `direction.ts` and re-export everything here, so
 * a client component still has one import to reach for.
 */

import type { Direction } from './locales.ts';

/**
 * Pick between a start-side and end-side value without writing a ternary on
 * direction at every call site. Reads better than `isRtl ? b : a` and cannot
 * be got backwards.
 */
export function byDirection<T>(direction: Direction, values: { ltr: T; rtl: T }): T {
  return direction === 'rtl' ? values.rtl : values.ltr;
}

/**
 * The sign a translate/rotate animation should carry so that "forward" means
 * "towards the end edge" in both directions. A drawer that slides in from the
 * start edge slides from the left in English and from the right in Arabic.
 */
export function directionSign(direction: Direction): 1 | -1 {
  return direction === 'rtl' ? -1 : 1;
}

/**
 * Icons that depict a physical object, a brand, or a media transport control
 * must not mirror: a camera is still a camera in Arabic, and a play triangle
 * still points at the timeline's future. Everything that encodes *direction of
 * travel through the interface* — chevrons, back arrows, progress, undo —
 * does mirror.
 *
 * The rule is applied by the Icon primitive; this is the shared predicate so
 * the gallery and the tests agree with it.
 */
export function shouldMirrorIcon(direction: Direction, noFlip: boolean): boolean {
  return direction === 'rtl' && !noFlip;
}

/** The `dir` attribute value for a web root or an isolated subtree. */
export function htmlDir(direction: Direction): 'ltr' | 'rtl' {
  return direction;
}
