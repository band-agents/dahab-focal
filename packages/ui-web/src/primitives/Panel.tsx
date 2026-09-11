/**
 * The panel — the console's workhorse surface.
 *
 * The traveler app's symbol tile, adapted for density: same cream ground, same
 * warm barely-there lift, tighter radius because a desktop panel holding a
 * table should not read as a pillow.
 */
import type { ReactNode } from 'react';

import { Mark } from '../marks/Mark';
import type { MarkName } from '@dahab/tokens/marks';

export interface PanelProps {
  readonly children: ReactNode;
  /** Section heading. Omit for an unlabelled container. */
  readonly title?: ReactNode;
  /** Sits above the title in clay-700, uppercase in Latin only. */
  readonly eyebrow?: ReactNode;
  readonly mark?: MarkName;
  /** Top-end corner — a filter, a link, a count. */
  readonly action?: ReactNode;
  /** Removes the body padding, so a table can meet the panel edge. */
  readonly flush?: boolean;
}

export function Panel({ children, title, eyebrow, mark, action, flush = false }: PanelProps) {
  const hasHeader = title !== undefined || eyebrow !== undefined || action !== undefined;

  return (
    <section className="rounded-xl bg-surface shadow-sm">
      {hasHeader ? (
        <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
          <div className="flex items-start gap-3">
            {mark === undefined ? null : <Mark name={mark} size={24} className="mt-1 shrink-0" />}
            <div>
              {eyebrow === undefined ? null : (
                <div className="text-overline uppercase text-text-muted">{eyebrow}</div>
              )}
              {title === undefined ? null : (
                <h2 className="font-display text-h2 text-text">{title}</h2>
              )}
            </div>
          </div>
          {action === undefined ? null : <div className="shrink-0">{action}</div>}
        </header>
      ) : null}
      <div className={flush ? '' : 'px-6 pb-5 pt-1'}>{children}</div>
    </section>
  );
}
