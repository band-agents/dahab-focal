import Link from 'next/link';
import type { Route } from 'next';

import type { Locale } from '@dahab/i18n/server';

/**
 * The two languages the dashboard is written in, each named in itself — so
 * somebody who landed on the wrong one can read the way out.
 */
const OFFERED: readonly { readonly locale: Locale; readonly name: string }[] = [
  { locale: 'ar-EG', name: 'العربية' },
  { locale: 'en-GB', name: 'English' },
];

export function LocaleSwitch({ current, rest = '' }: { readonly current: Locale; readonly rest?: string }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {OFFERED.map((option) => {
        const here = option.locale === current;
        return (
          <Link
            key={option.locale}
            href={(rest === '' ? `/${option.locale}` : `/${option.locale}/${rest}`) as Route}
            lang={option.locale}
            aria-current={here ? 'true' : undefined}
            className={`inline-flex min-h-11 items-center rounded-pill border px-4 text-body font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-c-focus ${
              here
                ? 'border-c-accent bg-c-accent text-c-on-accent'
                : 'border-c-edge-strong bg-c-surface text-c-text hover:bg-c-raised'
            }`}
          >
            {option.name}
          </Link>
        );
      })}
    </nav>
  );
}
