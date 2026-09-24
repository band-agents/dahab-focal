'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useDeferredValue, useId, useState } from 'react';

import { Icon, type IconName } from './Icon';

/**
 * Every module that opens, as a phone's home screen: a tile, a name, a tap.
 *
 * A launcher rather than a list because it is the shape people already know
 * how to use on a phone — a grid of rounded icons in colours that say which
 * part of the business each belongs to, with the count that matters riding on
 * the corner. Four across on a 375px phone is the most that keeps a two-line
 * name readable under its tile.
 *
 * The search box is the fastest way anywhere. It filters as you type, in the
 * browser, with no round trip; Enter opens the first match. Typing "pay" and
 * pressing Enter is quicker than finding Money on a grid, and it is how
 * people who use this every day will actually move.
 */

export type Area = 'run' | 'supply' | 'demand' | 'money' | 'platform';

export interface LauncherModule {
  readonly key: string;
  readonly name: string;
  readonly purpose: string;
  readonly href: Route;
  readonly icon: IconName;
  readonly area: Area;
  /** A live figure for the corner, already formatted for the locale. */
  readonly signal: string | null;
}

/*
 * Written out in full so Tailwind finds every class. A class assembled from
 * `bg-c-area-${area}` would never reach the stylesheet, and the tiles would
 * render grey with nothing failing.
 */
const AREA: Record<Area, string> = {
  run: 'bg-c-area-run text-c-area-run-ink',
  supply: 'bg-c-area-supply text-c-area-supply-ink',
  demand: 'bg-c-area-demand text-c-area-demand-ink',
  money: 'bg-c-area-money text-c-area-money-ink',
  platform: 'bg-c-area-platform text-c-area-platform-ink',
};

export function ModuleLauncher({
  modules,
  searchLabel,
  searchPlaceholder,
  noMatch,
}: {
  readonly modules: readonly LauncherModule[];
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly noMatch: string;
}) {
  const router = useRouter();
  const inputId = useId();
  const [query, setQuery] = useState('');
  // Deferred so a fast typist is never kept waiting on the grid re-rendering.
  const deferred = useDeferredValue(query);

  const needle = deferred.trim().toLocaleLowerCase();
  const shown =
    needle === ''
      ? modules
      : modules.filter(
          (module) =>
            module.name.toLocaleLowerCase().includes(needle) ||
            module.purpose.toLocaleLowerCase().includes(needle),
        );

  return (
    <div className="flex flex-col gap-3">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const first = shown[0];
          if (first !== undefined) router.push(first.href);
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          {searchLabel}
        </label>
        <div className="flex min-h-12 items-center gap-2.5 rounded-c-md border border-c-edge-strong bg-c-surface px-3.5 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-c-focus">
          <Icon name="search" size={19} className="shrink-0 text-c-muted" />
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            autoComplete="off"
            enterKeyHint="go"
            className="min-w-0 flex-1 bg-transparent font-console text-cBody text-c-text placeholder:text-c-muted focus:outline-none"
          />
        </div>
      </form>

      {shown.length === 0 ? (
        <p className="px-1 py-6 text-center font-console text-cBody text-c-muted">{noMatch}</p>
      ) : (
        <ul className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-5 lg:grid-cols-8">
          {shown.map((module) => (
            <li key={module.key} className="min-w-0">
              <Link
                href={module.href}
                className="group flex flex-col items-center gap-1.5 rounded-c-md p-1 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-focus"
              >
                <span
                  className={`relative grid size-14 place-items-center rounded-c-lg transition-transform duration-150 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-active:scale-95 ${AREA[module.area]}`}
                >
                  <Icon name={module.icon} size={26} />
                  {module.signal === null ? null : (
                    <span className="absolute -end-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-c-text px-1.5 text-cBadge text-c-bg ring-2 ring-c-bg">
                      {module.signal}
                    </span>
                  )}
                </span>
                <span className="line-clamp-2 w-full font-console text-cMeta text-c-text">
                  {module.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
