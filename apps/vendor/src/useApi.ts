import { useCallback, useEffect, useState } from 'react';

import type { Result } from './api';

/**
 * One read, with its three states kept apart.
 *
 * `loading`, `ok` and `problem` are distinct on purpose. A screen that folds
 * loading into empty shows a guide an empty manifest while the request is
 * still in flight, and on a phone with one bar that is most of the time they
 * are looking at it.
 */
export type Query<T> =
  | { status: 'loading' }
  /**
   * `cachedAt` is present only when the answer came off the phone rather than
   * the network. The screen shows its age; nothing renders a cached manifest
   * as though it were current.
   */
  | { status: 'ok'; data: T; cachedAt?: number }
  | { status: 'problem'; problem: Extract<Result<T>, { ok: false }>['problem'] };

export function useApi<T>(run: () => Promise<Result<T>>, deps: readonly unknown[]): {
  query: Query<T>;
  reload: () => void;
  /**
   * True only while a *reload* is in flight, never the first load.
   *
   * Pull-to-refresh draws its own spinner, and the screen keeps showing the
   * rows it already has underneath. Reusing `loading` would blank the
   * manifest a guide is reading the moment they pull on it.
   */
  refreshing: boolean;
} {
  const [query, setQuery] = useState<Query<T>>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // `run` is re-created on every render by every caller, so it cannot be a
  // dependency — the deps the caller declares are what this watches.
  const runRef = useCallback(run, deps);

  useEffect(() => {
    let live = true;
    // Only the first load blanks the screen. A reload leaves the rows in
    // place and lets the pull-to-refresh spinner carry the news.
    setQuery((current) => (current.status === 'ok' ? current : { status: 'loading' }));
    void runRef().then((result) => {
      // A response that arrives after the screen moved on must not write to
      // it; on a slow connection two reads can easily overlap.
      if (!live) return;
      setQuery(
        result.ok
          ? result.cachedAt === undefined
            ? { status: 'ok', data: result.data }
            : { status: 'ok', data: result.data, cachedAt: result.cachedAt }
          : { status: 'problem', problem: result.problem },
      );
      setRefreshing(false);
    });
    return () => {
      live = false;
    };
  }, [runRef, nonce]);

  const reload = useCallback(() => {
    setRefreshing(true);
    setNonce((value) => value + 1);
  }, []);

  return { query, reload, refreshing };
}
