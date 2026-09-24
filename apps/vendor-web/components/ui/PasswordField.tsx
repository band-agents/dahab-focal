'use client';

import { useId, useState } from 'react';

import { Icon } from './Icon';

/**
 * A password box with a "show" button.
 *
 * Typing a password you cannot see, on a phone keyboard, is where most failed
 * sign-ins come from — one wrong letter and no way to spot it. The button
 * shows what was typed; it goes back to dots on the next page load.
 */
export function PasswordField({
  name,
  label,
  hint,
  autoComplete,
  minLength,
  required = false,
  showLabel,
  hideLabel,
}: {
  readonly name: string;
  readonly label: string;
  readonly hint?: string;
  readonly autoComplete: 'current-password' | 'new-password';
  readonly minLength?: number;
  readonly required?: boolean;
  readonly showLabel: string;
  readonly hideLabel: string;
}) {
  const id = useId();
  const hintId = hint === undefined ? undefined : `${id}-hint`;
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-body font-semibold text-c-text">
        {label}
      </label>
      <div className="flex items-stretch gap-2">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={512}
          required={required}
          aria-describedby={hintId}
          dir="ltr"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="min-h-[3.25rem] min-w-0 flex-1 rounded-md border border-c-edge-strong bg-c-surface px-4 text-bodyL text-c-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-c-focus"
        />
        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          aria-pressed={visible}
          aria-controls={id}
          className="inline-flex min-h-[3.25rem] shrink-0 items-center gap-1.5 rounded-md border border-c-edge-strong bg-c-surface px-3 text-body font-semibold text-c-link hover:bg-c-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-c-focus"
        >
          <Icon name="eye" size={18} />
          {visible ? hideLabel : showLabel}
        </button>
      </div>
      {hint === undefined ? null : (
        <p id={hintId} className="text-small text-c-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
