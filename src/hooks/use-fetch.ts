import { useEffect, useState } from 'react';

interface Result<T> {
  source: unknown;
  data?: T;
  error?: string;
}

/**
 * Runs `fetcher` on mount and whenever its identity changes (wrap it in
 * useCallback). Loading is derived — "no result yet for this fetcher" — so the
 * effect only sets state after the request settles, never synchronously.
 */
export function useFetch<T>(fetcher: () => Promise<T>) {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetcher().then(
      (data) => {
        if (cancelled) return;
        setResult({ source: fetcher, data });
        setRefreshing(false);
      },
      (e: unknown) => {
        if (cancelled) return;
        setResult({ source: fetcher, error: e instanceof Error ? e.message : String(e) });
        setRefreshing(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [fetcher, tick]);

  const current = result && result.source === fetcher ? result : null;

  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    /** True until the first result for the current fetcher arrives. */
    loading: current === null,
    /** True during a pull-to-refresh (previous data stays on screen). */
    refreshing,
    /** Show the spinner again and re-fetch (e.g. "Try again" after an error). */
    retry: () => {
      setResult(null);
      setTick((t) => t + 1);
    },
    /** Pull-to-refresh: re-fetch while keeping the current data visible. */
    refresh: () => {
      setRefreshing(true);
      setTick((t) => t + 1);
    },
    /** Re-fetch in the background with no indicator (after an edit). */
    reload: () => setTick((t) => t + 1),
  };
}
