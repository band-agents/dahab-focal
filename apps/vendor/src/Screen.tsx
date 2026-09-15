import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import { colors, space } from '@dahab/tokens/theme';

/**
 * A screen, padded for the hardware it is actually on.
 *
 * Every screen used a fixed `pt-14`, which is right on a laptop and wrong on
 * a phone in both directions: too little on a device with a notch, where the
 * operator's name disappears under the camera, and too much on one without.
 * The inset is a measurement the OS makes, so it is asked rather than
 * guessed.
 *
 * The bottom inset is deliberately **not** added. Expo Router's tab bar
 * already sits in the home-indicator area and pads itself; adding it here
 * again would leave a band of empty cream above the tabs on every iPhone.
 */

/**
 * The design scale's own values, not numbers typed in here.
 *
 * The scale is authored in CSS units because the web consumes it directly;
 * React Native's style props take unitless numbers, so the "px" is stripped
 * once, here, rather than at every use.
 */
const px = (value: string): number => Number.parseFloat(value);

const TOP_GAP = px(space['6']);
const BOTTOM_GAP = px(space['10']);
const SIDE_GAP = px(space['5']);
const STACK_GAP = px(space['6']);

/**
 * The pull-to-refresh spinner, in the brand's own colour rather than the
 * platform's default blue — which is the one piece of chrome that would
 * otherwise be from somebody else's design system.
 */
const SPINNER = colors.light['lagoon-focus'] ?? colors.light['ink-900'];

export function Screen({
  children,
  onRefresh,
  refreshing = false,
}: {
  readonly children: ReactNode;
  /**
   * Pull to refresh. Every screen here reads something that changes while an
   * operator is looking at it — a traveller checks in, a booking is paid —
   * and on a phone the pull is the gesture people already reach for. Without
   * it the only way to see new rows is to kill the app.
   */
  readonly onRefresh?: () => void;
  readonly refreshing?: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{
        paddingTop: insets.top + TOP_GAP,
        paddingBottom: BOTTOM_GAP,
        paddingHorizontal: SIDE_GAP,
        gap: STACK_GAP,
      }}
      // A guide taps a field, then taps a button. Without this the first tap
      // only dismisses the keyboard and the second is the one that counts.
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh === undefined ? undefined : (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            // The spinner is a piece of the design system, not the platform's
            // default blue.
            tintColor={SPINNER}
            colors={[SPINNER]}
          />
        )
      }
    >
      {children}
    </ScrollView>
  );
}

/**
 * The same padding for a screen that is not a scroller — the sign-in, which
 * is a short form and should not bounce.
 */
export function Pane({ children }: { readonly children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-bg"
      style={{
        paddingTop: insets.top + TOP_GAP,
        paddingBottom: insets.bottom + BOTTOM_GAP,
        paddingHorizontal: SIDE_GAP,
        gap: STACK_GAP,
      }}
    >
      {children}
    </View>
  );
}
