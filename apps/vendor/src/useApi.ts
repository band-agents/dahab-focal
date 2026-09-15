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
  | { status: 'ok'; data: T }
  | { status: 'problem'; problem: Extract<Result<T>, { ok: false }>['problem'] };

export function useApi<T>(run: () => Promise<Result<T>>, deps: readonly unknown[]): {
  query: Query<T>;
  reload: () => void;
} {
  const [query, setQuery] = useState<Query<T>>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);

  // `run` is re-created on every render by every caller, so it cannot be a
  // dependency — the deps the caller declares are what this watches.
  const runRef = useCallback(run, deps);

  useEffect(() => {
    let live = true;
    setQuery({ status: 'loading' });
    void runRef().then((result) => {
      // A response that arrives after the screen moved on must not write to
      // it; on a slow connection two reads can easily overlap.
      if (!live) return;
      setQuery(result.ok ? { status: 'ok', data: result.data } : { status: 'problem', problem: result.problem });
    });
    return () => {
      live = false;
    };
  }, [runRef, nonce]);

  return { query, reload: () => setNonce((value) => value + 1) };
}
