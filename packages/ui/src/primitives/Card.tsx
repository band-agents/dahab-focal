import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import type { MarkName } from '@dahab/tokens/marks';

import { Mark } from '../marks/Mark';
import { useDisplayFontClass } from '../theme';

/**
 * The card, and the row — the two containers a phone screen is made of.
 *
 * A card is one idea: a symbol, a short line in the display face, and at most
 * one number. Anything needing three lines of metadata is two cards or a
 * detail screen, which is the rule that keeps the vendor app readable at the
 * dock rather than turning into a spreadsheet.
 */

export interface CardProps {
  readonly children: ReactNode;
  readonly title?: ReactNode;
  readonly eyebrow?: ReactNode;
  readonly mark?: MarkName;
  /** Top-end corner — a count, a status, an action. */
  readonly trailing?: ReactNode;
  /** Family tint for a categorical card; defaults to the plain surface. */
  readonly surface?: string;
}

export function Card({ children, title, eyebrow, mark, trailing, surface }: CardProps) {
  const display = useDisplayFontClass();

  const hasHeader = title !== undefined || eyebrow !== undefined || trailing !== undefined;

  return (
    <View className={`rounded-card p-5 ${surface ?? 'bg-surface'}`}>
      {hasHeader ? (
        <View className="mb-3 flex-row items-start justify-between gap-4">
          <View className="flex-1 flex-row items-start gap-3">
            {mark === undefined ? null : <Mark name={mark} size={40} />}
            <View className="flex-1">
              {eyebrow === undefined ? null : (
                <Text className="font-ui text-overline uppercase text-text-muted">{eyebrow}</Text>
              )}
              {/* The display face for the script actually being drawn. Baloo 2
                  carries no Arabic glyphs at all, so a hardcoded
                  `font-display` on an Arabic title falls back to the system
                  font on the web and draws nothing on a phone. */}
              {title === undefined ? null : (
                <Text className={`${display} text-h2 text-text`}>{title}</Text>
              )}
            </View>
          </View>
          {trailing === undefined ? null : <View>{trailing}</View>}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export interface RowProps {
  readonly title: ReactNode;
  readonly meta?: ReactNode;
  /** A second line of context — the operator, the site, the time. */
  readonly detail?: ReactNode;
  readonly mark?: MarkName;
  readonly trailing?: ReactNode;
}

/** One item in a list. Marks sit at 40px, per the traveler app's floor. */
export function Row({ title, meta, detail, mark, trailing }: RowProps) {
  return (
    <View className="flex-row items-center gap-4 border-b border-border py-4 last:border-b-0">
      {mark === undefined ? null : <Mark name={mark} size={40} />}
      <View className="flex-1">
        <Text className="font-ui text-h3 text-text">{title}</Text>
        {detail === undefined ? null : (
          <Text className="font-ui text-body text-text-muted">{detail}</Text>
        )}
        {meta === undefined ? null : (
          <Text className="font-ui text-small text-text-muted">{meta}</Text>
        )}
      </View>
      {trailing === undefined ? null : <View className="items-end">{trailing}</View>}
    </View>
  );
}
