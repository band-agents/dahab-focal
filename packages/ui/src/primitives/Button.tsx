import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { MarkName } from '@dahab/tokens/marks';

import { Mark } from '../marks/Mark';

/**
 * The button — the React Native half.
 *
 * The system's hardest rule is enforced the same way it is on the web: the
 * primary button is a blush-200 fill with an ink-900 label, and the API makes
 * white-on-fill impossible to express rather than merely discouraged.
 *
 * On a phone at the dock this is the control a guide hits with wet hands, so
 * the 44pt floor is not negotiable and `hitSlop` covers anything drawn
 * smaller than its target.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const VARIANTS: Record<ButtonVariant, { base: string; pressed: string; label: string }> = {
  primary: {
    base: 'bg-cta-fill border border-cta-edge',
    pressed: 'bg-cta-fill-pressed',
    label: 'text-cta-label',
  },
  secondary: {
    // Outline-on-page, not lagoon-on-mint: that pair computes 4.29 against a
    // 4.5 bar and is one of the design system's open gaps.
    base: 'bg-surface border border-border-strong',
    pressed: 'bg-surface-raised',
    label: 'text-text',
  },
  ghost: {
    base: 'bg-transparent border border-transparent',
    pressed: 'bg-surface-raised',
    label: 'text-text-link',
  },
};

export interface ButtonProps {
  readonly variant?: ButtonVariant;
  readonly children: ReactNode;
  readonly mark?: MarkName;
  readonly onPress?: () => void;
  readonly disabled?: boolean;
  /** Spans the width it is given — the default for a sheet's primary action. */
  readonly block?: boolean;
}

export function Button({
  variant = 'secondary',
  children,
  mark,
  onPress,
  disabled = false,
  block = false,
}: ButtonProps) {
  const spec = VARIANTS[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      hitSlop={8}
      className={`min-h-11 flex-row items-center justify-center gap-2 rounded-input px-4 ${
        block ? 'w-full' : ''
      } ${spec.base} ${disabled ? 'opacity-50' : ''}`}
    >
      {({ pressed }) => (
        <View
          className={`flex-row items-center gap-2 ${pressed && !disabled ? spec.pressed : ''}`}
        >
          {mark === undefined ? null : <Mark name={mark} size={20} />}
          <Text className={`font-ui text-body ${spec.label}`}>{children}</Text>
        </View>
      )}
    </Pressable>
  );
}
