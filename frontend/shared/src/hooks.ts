// Small React hooks shared by the two apps (react is a peer dependency, resolved from the root node_modules).
// Server state goes through TanStack Query (query.tsx); the polled read of the table map keeps its ETag through poll().
import { useEffect, useState } from 'react';
import { type ApiError, poll } from './api';
export { useSession } from './session';

export interface Polled<T> { data: T | null; error: ApiError | null }

/** GET `path` now and every `intervalMs` with If-None-Match (ADR-09): the data changes only when the ETag does.
 *  An empty path polls nothing. */
export function usePolled<T>(path: string | null | undefined, intervalMs = 2000): Polled<T> {
  const [state, setState] = useState<Polled<T>>({ data: null, error: null });
  useEffect(() => {
    setState({ data: null, error: null });
    if (!path) return;
    return poll<T>(path, intervalMs, (data) => setState({ data, error: null }), (error) => setState((s) => ({ ...s, error })));
  }, [path, intervalMs]);
  return state;
}

/** A countdown in seconds from `until` (RFC 3339), ticking every second; null without a time. */
export function useCountdown(until: string | null | undefined): number | null {
  const compute = () => (until ? Math.max(0, Math.round((new Date(until).getTime() - Date.now()) / 1000)) : null);
  const [left, setLeft] = useState<number | null>(compute);
  useEffect(() => {
    setLeft(compute());
    if (!until) return;
    const timer = setInterval(() => setLeft(compute()), 1000);
    return () => clearInterval(timer);
  }, [until]);   // eslint-disable-line react-hooks/exhaustive-deps
  return left;
}
