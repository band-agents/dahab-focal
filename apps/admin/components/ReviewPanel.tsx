import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import { Button, Mark, Panel } from '@dahab/ui-web';
import type { MarkName } from '@dahab/ui-web';

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
 */
export interface ReviewPanelProps {
  readonly t: Translate;
  readonly title: string;
  readonly mark: MarkName;
  /** What is about to change, in the operator's words rather than ids. */
  readonly summary: ReactNode;
  readonly action: (formData: FormData) => Promise<void>;
  /** Hidden fields: the locale, and whatever identifies the row. */
  readonly hidden: Readonly<Record<string, string>>;
  readonly approve: { value: string; label: string; mark: MarkName };
  /** Absent where there is only one way forward, as with a cancellation. */
  readonly reject?: { value: string; label: string; mark: MarkName };
  readonly reasonLabel: string;
  readonly reasonHint: string;
  readonly closeHref: Route;
}

export function ReviewPanel({
  t,
  title,
  mark,
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
    <Panel title={title} mark={mark}>
      <div className="flex flex-col gap-5">
        <div className="text-body text-text">{summary}</div>

        <form action={action} className="flex flex-col gap-4">
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}

          <label className="flex flex-col gap-2">
            <span className="font-ui text-small text-text">{reasonLabel}</span>
            <textarea
              name="reason"
              required
              minLength={8}
              maxLength={2000}
              rows={3}
              className="w-full rounded-input border border-border-strong bg-surface p-4 font-ui text-body text-text placeholder:text-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            />
            <span className="text-caption text-text-muted">{reasonHint}</span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" name="decision" value={approve.value} variant="primary" mark={approve.mark}>
              {approve.label}
            </Button>
            {reject === undefined ? null : (
              <Button type="submit" name="decision" value={reject.value} variant="secondary" mark={reject.mark}>
                {reject.label}
              </Button>
            )}
            <Link
              href={closeHref}
              className="inline-flex min-h-11 items-center rounded-input px-4 font-ui text-body text-text-link focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              {t('admin.review.close')}
            </Link>
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
    <p
      // Announced rather than only coloured: status here is a colour, a mark
      // and a sentence, never one of the three on its own.
      role="status"
      className={`flex items-start gap-2 rounded-lg p-4 font-ui text-small ${
        good ? 'bg-success-surface text-success-text' : 'bg-warning-surface text-warning-text'
      }`}
    >
      <Mark name={good ? 'eco' : 'sos'} size={20} className="mt-0.5 shrink-0" />
      {t(`admin.review.outcome.${outcome}`)}
    </p>
  );
}
