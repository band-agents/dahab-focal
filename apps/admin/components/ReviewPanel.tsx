import type { Route } from 'next';
import type { ReactNode } from 'react';

import { Action, Banner, Panel, type IconName } from '@/components/console';
import type { Translate } from '@/lib/i18n';

/**
 * The panel an operator reviews something in.
 *
 * It exists because none of these decisions should be one click from a table
 * row. A rejected permit, an unpublished listing and a cancelled boat all
 * reach a real person, so the panel shows what is about to change, takes a
 * reason, and puts the two outcomes side by side — rather than a "Review"
 * button that silently did the safe one.
 *
 * Plain HTML: two submit buttons in one form, distinguished by their own
 * `name`/`value`. No JavaScript, no dialog, nothing to hydrate. The reason
 * field is `required` and the API checks the length again, because a
 * client-side rule is a courtesy and the server's is the rule.
 *
 * On a phone the two decisions stack full-width rather than sitting side by
 * side — `ActionRow`'s own behaviour — so neither is the one your thumb
 * reaches by accident.
 */
export interface ReviewPanelProps {
  readonly t: Translate;
  readonly title: string;
  /** What is about to change, in the operator's words rather than ids. */
  readonly summary: ReactNode;
  readonly action: (formData: FormData) => Promise<void>;
  /** Hidden fields: the locale, and whatever identifies the row. */
  readonly hidden: Readonly<Record<string, string>>;
  readonly approve: { value: string; label: string; icon: IconName };
  /** Absent where there is only one way forward, as with a cancellation. */
  readonly reject?: { value: string; label: string; icon: IconName };
  readonly reasonLabel: string;
  readonly reasonHint: string;
  readonly closeHref: Route;
}

export function ReviewPanel({
  t,
  title,
  summary,
  action,
  hidden,
  approve,
  reject,
  reasonLabel,
  reasonHint,
  closeHref,
}: ReviewPanelProps) {
  return (
    <Panel title={title}>
      <div className="flex flex-col gap-4">
        <div className="font-console text-cBody text-c-text">{summary}</div>

        <form action={action} className="flex flex-col gap-3">
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}

          <label className="flex flex-col gap-1.5">
            <span className="font-console text-cLabel text-c-text">{reasonLabel}</span>
            <textarea
              name="reason"
              required
              minLength={8}
              maxLength={2000}
              rows={3}
              className="w-full rounded-c-sm border border-c-edge-strong bg-c-surface p-3 font-console text-cBody text-c-text placeholder:text-c-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-focus"
            />
            <span className="font-console text-cMeta text-c-muted">{reasonHint}</span>
          </label>

          {/*
            Two decisions and a way out. They stack on a phone, where a row of
            three small targets next to a reason field is how somebody rejects
            a permit they meant to approve.
          */}
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Action type="submit" name="decision" value={approve.value} intent="primary" icon={approve.icon}>
              {approve.label}
            </Action>
            {reject === undefined ? null : (
              <Action type="submit" name="decision" value={reject.value} intent="danger" icon={reject.icon}>
                {reject.label}
              </Action>
            )}
            <Action href={closeHref} intent="quiet">
              {t('admin.review.close')}
            </Action>
          </div>
        </form>
      </div>
    </Panel>
  );
}

/** What happened last time, said once, above the board. */
export function OutcomeNotice({ outcome, t }: { outcome: string; t: Translate }) {
  const known = ['done', 'conflict', 'refused', 'failed'].includes(outcome);
  if (!known) return null;

  const good = outcome === 'done';
  return (
    // Announced rather than only coloured: status here is a colour, an icon
    // and a sentence, never one of the three on its own.
    <div role="status">
      <Banner
        tone={good ? 'success' : 'warning'}
        title={t(`admin.review.outcome.${outcome}`)}
      />
    </div>
  );
}
