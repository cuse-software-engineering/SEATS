// Small React hooks shared by the two apps (react is a peer dependency, resolved from the root node_modules).
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { type ApiError, toApiError } from './api';
import { getSession, subscribe, type Session } from './session';

export const useSession = (): Session | null => useSyncExternalStore(subscribe, getSession, getSession);

export interface Loaded<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
  setData: (data: T | null) => void;
}

/** Loads once per change of `deps` (and on reload()); the error is kept for the alert box, never swallowed. */
export function useLoad<T>(load: () => Promise<T>, deps: readonly unknown[]): Loaded<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    load().then(
      (d) => { if (live) { setData(d); setError(null); } },
      (e: unknown) => { if (live) setError(toApiError(e)); },
    ).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [...deps, tick]);   // eslint-disable-line react-hooks/exhaustive-deps
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload, setData };
}

export interface Action {
  error: ApiError | null;
  busy: boolean;
  /** Runs one call; on failure keeps the error for the alert box and resolves to undefined. */
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
  clear: () => void;
}

export function useAction(): Action {
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(toApiError(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  const clear = useCallback(() => setError(null), []);
  return { error, busy, run, clear };
}
