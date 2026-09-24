import type { ReactNode } from 'react';

/**
 * A labelled box to type in.
 *
 * The label sits above the box and stays there — never a placeholder that
 * vanishes the moment you start typing and leaves you wondering what the box
 * was for. The hint says what a good answer looks like, in plain words.
 */

const BOX =
  'w-full rounded-md border border-c-edge-strong bg-c-surface px-4 text-bodyL text-c-text placeholder:text-c-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-c-focus';

export function Field({
  name,
  label,
  hint,
  value,
  type = 'text',
  multiline = false,
  maxLength,
  required = false,
  ltr = false,
  placeholder,
  autoComplete,
  inputMode,
}: {
  readonly name: string;
  readonly label: string;
  readonly hint?: ReactNode;
  readonly value?: string | null;
  readonly type?: 'text' | 'email' | 'tel' | 'url' | 'password';
  readonly multiline?: boolean;
  readonly maxLength?: number;
  readonly required?: boolean;
  /**
   * A phone number, an address, a website: left-to-right even on an Arabic
   * page. Without this the bidi algorithm reorders what somebody typed and
   * they cannot tell whether they typed it wrong or it is being shown wrong.
   */
  readonly ltr?: boolean;
  readonly placeholder?: string;
  readonly autoComplete?: string;
  readonly inputMode?: 'text' | 'tel' | 'email' | 'url' | 'numeric';
}) {
  const id = `field-${name}`;
  const hintId = hint === undefined ? undefined : `${id}-hint`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-body font-semibold text-c-text">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          name={name}
          defaultValue={value ?? ''}
          maxLength={maxLength}
          required={required}
          rows={5}
          dir="auto"
          aria-describedby={hintId}
          placeholder={placeholder}
          className={`${BOX} py-3 leading-relaxed`}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          defaultValue={value ?? ''}
          maxLength={maxLength}
          required={required}
          aria-describedby={hintId}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          dir={ltr ? 'ltr' : 'auto'}
          className={`${BOX} min-h-[3.25rem]`}
        />
      )}
      {hint === undefined ? null : (
        <p id={hintId} className="text-small text-c-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
