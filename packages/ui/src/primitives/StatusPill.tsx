import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import type { MarkName } from '@dahab/tokens/marks';

import { Mark } from '../marks/Mark';

/**
 * Status, never by colour alone — the React Native half.
 *
 * Same contract as the web pill: there is no prop for a bare coloured dot and
 * the label is required. A guide reading a manifest in Dahab sunlight needs
 * the word more than the colour, not less.
 */

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONES: Record<StatusTone, { surface: string; text: string; mark: MarkName }> = {
  success: { surface: 'bg-success-surface', text: 'text-success-text', mark: 'eco' },
  warning: { surface: 'bg-warning-surface', text: 'text-warning-text', mark: 'firstAid' },
  danger: { surface: 'bg-danger-surface', text: 'text-danger-text', mark: 'sos' },
  info: { surface: 'bg-info-surface', text: 'text-info-text', mark: 'chat' },
  // Semantic tokens only: the raw ramp steps carry no Night Dive value.
  neutral: { surface: 'bg-surface-raised', text: 'text-text', mark: 'pass' },
};

export interface StatusPillProps {
  readonly tone: StatusTone;
  readonly children: ReactNode;
  readonly mark?: MarkName;
  /** Set when the pill sits on the page ground rather than a surface. */
  readonly onCream?: boolean;
}

export function StatusPill({ tone, children, mark, onCream = false }: StatusPillProps) {
  const spec = TONES[tone];
  const text = tone === 'danger' && onCream ? 'text-danger-text-on-cream' : spec.text;

  return (
    <View className={`flex-row items-center gap-2 rounded-pill ps-2 pe-3 py-1 ${spec.surface}`}>
      <Mark name={mark ?? spec.mark} size={16} />
      <Text className={`font-ui text-small ${text}`}>{children}</Text>
    </View>
  );
}
