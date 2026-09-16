import type { Route } from 'next';
import type { ReactNode } from 'react';

import { Action } from './Action';
import type { IconName } from './Icon';
import { Panel } from './Panel';

/**
 * The one way this console asks for a decision.
 *
 * Every write in Sky Eye goes through this: verify a document, publish a
 * listing, cancel a departure, suspend an operator, create an account, grant
 * a role. They differ in what they ask for and not in how they ask, so the
 * shape is declared once here and each screen supplies a descriptor.
 *
 * Three things it makes unskippable, because they are the rules the API
 * enforces on the other side and a form that could omit them would only
 * produce a refusal the operator has to decode:
 *
 *   - **A reason, always.** `required`, `minLength` 8, and the server checks
 *     again. An admin holds every permission; recording why is the
 *     counterweight, and it is what a complaint six months later is read
 *     against.
 *   - **The destructive choice is never the pretty one.** `intent` decides
 *     which button gets the accent, and a panel whose confirm is destructive
 *     draws it in danger ink rather than as the primary.
 *   - **A way out.** Every panel carries a close link, so nothing is a
 *     dead end reached by a mis-tap.
 *
 * Plain HTML throughout — a form, a server action, two submit buttons told
 * apart by their own name and value. No JavaScript, nothing to hydrate. The
 * console is the screen somebody reaches when something else is broken.
 */

export interface ActionField {
  readonly name: string;
  readonly label: string;
  /** `select` needs `options`; everything else is an input of that type. */
  readonly type: 'text' | 'email' | 'tel' | 'select';
  readonly value?: string;
  readonly required?: boolean;
  readonly hint?: string;
  readonly options?: readonly { readonly value: string; readonly label: string }[];
  /** Latin-only content — an address, a phone, a country code. */
  readonly ltr?: boolean;
}

export interface ActionChoice {
  /** Posted as `decision`, so one action can serve approve and reject. */
  readonly value: string;
  readonly label: string;
  readonly icon: IconName;
}

export interface ActionPanelProps {
  readonly title: string;
  /** What is about to change, in the operator's words rather than ids. */
  readonly summary: ReactNode;
  readonly action: (formData: FormData) => Promise<void>;
  /** The locale, the row's id, and where to come back to. */
  readonly hidden: Readonly<Record<string, string>>;
  readonly fields?: readonly ActionField[];
  readonly confirm: ActionChoice;
  /** A second outcome — reject beside verify. Absent where there is one way. */
  readonly secondary?: ActionChoice;
  /** Draws the confirm in danger ink instead of the accent. */
  readonly intent?: 'primary' | 'danger';
  readonly reasonLabel: string;
  readonly reasonHint: string;
  readonly closeHref: Route;
  readonly closeLabel: string;
}

const FIELD =
  'min-h-11 w-full rounded-c-sm border border-c-edge-strong bg-c-surface px-3 font-console text-cBody text-c-text placeholder:text-c-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-focus';

export function ActionPanel({
  title,
  summary,
  action,
  hidden,
  fields = [],
  confirm,
  secondary,
  intent = 'primary',
  reasonLabel,
  reasonHint,
  closeHref,
  closeLabel,
}: ActionPanelProps) {
  return (
    <Panel title={title}>
      <div className="flex flex-col gap-4">
        <div className="font-console text-cBody text-c-text">{summary}</div>

        <form action={action} className="flex flex-col gap-3">
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}

          {fields.map((field) => (
            <label key={field.name} className="flex flex-col gap-1.5">
              <span className="font-console text-cLabel text-c-text">{field.label}</span>
              {field.type === 'select' ? (
                <select
                  name={field.name}
                  defaultValue={field.value ?? ''}
                  required={field.required}
                  className={FIELD}
                >
                  {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name={field.name}
                  type={field.type}
                  defaultValue={field.value ?? ''}
                  required={field.required}
                  /*
                   * An address, a phone number and a country code are Latin
                   * and left-to-right even on an Arabic page. Without this the
                   * bidi algorithm reorders what somebody typed, and they
                   * cannot tell whether they typed it wrong or it is being
                   * displayed wrong.
                   */
                  {...(field.ltr === true ? { dir: 'ltr' as const } : {})}
                  className={FIELD}
                />
              )}
              {field.hint === undefined ? null : (
                <span className="font-console text-cMeta text-c-muted">{field.hint}</span>
              )}
            </label>
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
            Stacked on a phone. A row of three small targets beside a reason
            field is how somebody rejects a permit they meant to approve.
          */}
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Action
              type="submit"
              name="decision"
              value={confirm.value}
              intent={intent}
              icon={confirm.icon}
            >
              {confirm.label}
            </Action>
            {secondary === undefined ? null : (
              <Action
                type="submit"
                name="decision"
                value={secondary.value}
                intent="danger"
                icon={secondary.icon}
              >
                {secondary.label}
              </Action>
            )}
            <Action href={closeHref} intent="quiet">
              {closeLabel}
            </Action>
          </div>
        </form>
      </div>
    </Panel>
  );
}
