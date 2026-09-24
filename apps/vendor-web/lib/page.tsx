import { isLocale, type Locale } from '@dahab/i18n/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { Notice } from '@/components/ui/Bits';
import { translator } from '@/lib/i18n';

/**
 * What every screen shares: its language, its heading, and — after a form
 * posts back — the one sentence that says whether it worked.
 */
export function resolveLocale(raw: string): Locale {
  if (!isLocale(raw)) notFound();
  return raw;
}

/** The heading at the top of a screen. One title, one plain sentence. */
export function Heading({ title, subtitle }: { readonly title: string; readonly subtitle?: string }) {
  return (
    <header className="mb-5 flex flex-col gap-1">
      <h1 className="text-h1 font-semibold text-c-text">{title}</h1>
      {subtitle === undefined ? null : <p className="text-bodyL text-c-muted">{subtitle}</p>}
    </header>
  );
}

/**
 * The result of the last form, carried in the URL as `?done=<key>` or
 * `?error=<key>`. A key rather than a sentence, so a crafted link cannot put
 * words in the dashboard's mouth — only a message that already exists can be
 * shown, and an unknown key shows nothing.
 *
 * Drawn as a toast over the bottom of the screen rather than at the top of
 * the page: the button that was pressed is usually at the bottom of a long
 * form, and a "saved" nobody scrolled up to see is no confirmation at all.
 */
export function Outcome({
  locale,
  done,
  error,
  messages,
}: {
  readonly locale: Locale;
  readonly done?: string | undefined;
  readonly error?: string | undefined;
  /** Allowed keys → the message key to show for each. */
  readonly messages: Readonly<Record<string, string>>;
}) {
  const t = translator(locale);
  const shown =
    done !== undefined && Object.hasOwn(messages, done)
      ? ({ tone: 'success', key: messages[done] as string } as const)
      : error !== undefined && Object.hasOwn(messages, error)
        ? ({ tone: 'danger', key: messages[error] as string } as const)
        : null;
  if (shown === null) return null;
  return (
    <div className="partner-toast pointer-events-none fixed inset-x-4 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md lg:bottom-6 lg:start-[calc(var(--partner-rail)+2rem)]">
      <div className="rounded-md shadow-lg ring-1 ring-c-edge">
        <Notice tone={shown.tone} title={t(shown.key)} />
      </div>
    </div>
  );
}

/** The vertical rhythm between the blocks of a screen. */
export function Stack({ children }: { readonly children: ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}
