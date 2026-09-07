import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { motion } from '@dahab/tokens';

/**
 * The named curves and durations, and the one hook every animation must
 * respect. Under `prefers-reduced-motion` every signature collapses to a
 * 120ms opacity fade (CLAUDE.md / tokens.json motion.reducedMotion).
 */

export const curves = motion.curves;
export const durations = motion.durations;

/** ms as a number, for Animated/Reanimated configs. */
export function durationMs(name: keyof typeof durations): number {
  return Number.parseInt(durations[name], 10);
}

export const REDUCED_MOTION_FALLBACK = {
  durationMs: 120,
  property: 'opacity' as const,
};

/**
 * Tracks the OS "reduce motion" setting. Starts from the current value and
 * updates on change. On web this is backed by `prefers-reduced-motion`.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      setReduced(value);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}

/**
 * Pick a motion config, collapsing to the reduced-motion fallback when the
 * viewer has asked for less movement.
 */
export function withReducedMotion<T>(reduced: boolean, full: T, collapsed: T): T {
  return reduced ? collapsed : full;
}
