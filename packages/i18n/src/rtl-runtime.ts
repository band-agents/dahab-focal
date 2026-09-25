/**
 * Switching direction at runtime in React Native.
 *
 * `I18nManager.forceRTL()` writes a native flag that only takes effect on the
 * next launch. An app that calls it and carries on is now in a half-flipped
 * state: JS thinks it is RTL, the native view hierarchy is still LTR, and
 * every `start`/`end` resolves the wrong way until something restarts it.
 *
 * So the switch is modelled as an explicit three-step transaction, and the
 * caller is told which step it is in so it can show a designed transition
 * rather than a flicker:
 *
 *   1. `planDirectionChange` — decide whether a reload is even needed.
 *   2. `applyDirectionChange` — persist the preference, set the native flag.
 *   3. reload — the adapter's job, so this package stays platform-agnostic.
 *
 * The platform is injected rather than imported so `@dahab/i18n` never pulls
 * `react-native` or `expo-updates` into the Next.js admin bundle. The Expo
 * apps register the native adapter at startup; the web adapter flips
 * `document.documentElement.dir` and needs no reload at all.
 */

import { LOCALE_DESCRIPTORS, type Direction, type Locale } from './locales.ts';

export interface RtlPlatformAdapter {
  readonly name: 'react-native' | 'web' | 'test';
  /** Direction the platform is currently laid out in, not the one we want. */
  currentLayoutDirection(): Direction;
  /** True when changing the flag requires a process restart to take effect. */
  requiresReload(): boolean;
  /** Persist the flag. On RN: allowRTL + forceRTL. On web: set `dir`. */
  setLayoutDirection(direction: Direction): void | Promise<void>;
  /** Restart the app. On RN: `Updates.reloadAsync()`. On web: a no-op. */
  reload(): Promise<void>;
}

let adapter: RtlPlatformAdapter | null = null;

export function registerRtlPlatform(next: RtlPlatformAdapter): void {
  adapter = next;
}

export function getRtlPlatform(): RtlPlatformAdapter {
  if (adapter === null) {
    throw new Error(
      'No RTL platform adapter registered. Call registerRtlPlatform() at app startup — ' +
        '@dahab/ui exports createNativeRtlPlatform() and createWebRtlPlatform().',
    );
  }
  return adapter;
}

export interface DirectionChangePlan {
  readonly from: Direction;
  readonly to: Direction;
  /** Nothing to do — the platform is already laid out this way. */
  readonly noop: boolean;
  /**
   * The app must restart for the change to land. The caller is expected to
   * show the designed "switching language" transition across the restart,
   * never to leave the user looking at a half-flipped screen.
   */
  readonly reloadRequired: boolean;
}

export function planDirectionChange(nextLocale: Locale): DirectionChangePlan {
  const platform = getRtlPlatform();
  const from = platform.currentLayoutDirection();
  const to = LOCALE_DESCRIPTORS[nextLocale].direction;
  const noop = from === to;
  return {
    from,
    to,
    noop,
    reloadRequired: !noop && platform.requiresReload(),
  };
}

export interface ApplyDirectionOptions {
  /**
   * Called after the native flag is set and before the reload, so the caller
   * can persist the locale preference and paint the transition. If it
   * throws, the reload does not happen and the app stays consistent.
   */
  readonly beforeReload?: () => void | Promise<void>;
  /** Escape hatch for tests and for previewing without restarting. */
  readonly skipReload?: boolean;
}

/**
 * Apply a locale's direction. Resolves *before* the reload when a reload is
 * needed — on React Native the promise after `reloadAsync()` never settles,
 * so callers must not await their way past it.
 */
export async function applyDirectionChange(
  nextLocale: Locale,
  options: ApplyDirectionOptions = {},
): Promise<DirectionChangePlan> {
  const plan = planDirectionChange(nextLocale);
  if (plan.noop) {
    await options.beforeReload?.();
    return plan;
  }

  const platform = getRtlPlatform();
  await platform.setLayoutDirection(plan.to);
  await options.beforeReload?.();

  if (plan.reloadRequired && options.skipReload !== true) {
    await platform.reload();
  }
  return plan;
}
