// Server state through TanStack Query: one client per app, the providers both apps mount, and two helpers that give
// every call the same shape: useGet() reads a path, useMutate() runs a change, reports it as a toast and refreshes
// what it touched. The polled table map keeps its ETag through usePolled() in hooks.ts.
import { type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider, useMutation, type UseMutationOptions, useQuery, useQueryClient, type QueryKey, type UseQueryOptions } from '@tanstack/react-query';
import { api, ApiError, toApiError } from './api';
import { ConfirmDialogHost } from './dialog';
import { toast, ToastStack } from './toast';

export const createQueryClient = (): QueryClient => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      refetchOnWindowFocus: false,
      retry: (count, e) => count < 2 && (!(e instanceof ApiError) || e.status === 0 || e.status >= 500),   // never retry a refusal
    },
    mutations: { retry: 0 },
  },
});

/** QueryClientProvider, the toast stack and the confirm dialog: wrap the router in it. */
export function AppProviders({ children, client }: { children: ReactNode; client?: QueryClient }) {
  const [own] = useState(() => client ?? createQueryClient());
  return (
    <QueryClientProvider client={own}>
      {children}
      <ToastStack />
      <ConfirmDialogHost />
    </QueryClientProvider>
  );
}

/** GET `path` under `key`; a null path disables the query. */
export function useGet<T>(key: QueryKey, path: string | null | undefined, options: Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn'> = {}) {
  return useQuery<T, ApiError>({ queryKey: key, queryFn: () => api.get<T>(path as string), enabled: Boolean(path) && (options.enabled ?? true), ...options });
}

export interface MutateOptions<In, Out> extends Omit<UseMutationOptions<Out, ApiError, In>, 'mutationFn' | 'onSuccess' | 'onError'> {
  /** What to say when it worked; a function may use the answer. Nothing: no toast. */
  success?: string | ((out: Out, input: In) => string);
  /** What to say when it failed, before the gateway's reason; default "Could not …". */
  failure?: string;
  /** The query keys to refresh afterwards (prefix match). */
  invalidate?: QueryKey[];
  /** A failure the screen explains itself (true, or a test of the error): no error toast for it. */
  quiet?: boolean | ((error: ApiError) => boolean);
  onSuccess?: (out: Out, input: In) => void | Promise<unknown>;
  onError?: (error: ApiError, input: In) => void;
}

/** One change through the gateway with the feedback every click owes the user. */
export function useMutate<In = void, Out = unknown>(fn: (input: In) => Promise<Out>, { success, failure, invalidate = [], quiet, onSuccess, onError, ...rest }: MutateOptions<In, Out> = {}) {
  const client = useQueryClient();
  return useMutation<Out, ApiError, In>({
    mutationFn: async (input) => { try { return await fn(input); } catch (e) { throw toApiError(e); } },
    onSuccess: async (out, input) => {
      await Promise.all(invalidate.map((key) => client.invalidateQueries({ queryKey: key })));
      if (success) toast.success(typeof success === 'function' ? success(out, input) : success);
      await onSuccess?.(out, input);
    },
    onError: (error, input) => {
      const silent = typeof quiet === 'function' ? quiet(error) : Boolean(quiet);
      if (!silent) toast.error(failure ? `${failure}: ${describeError(error)}` : describeError(error));
      onError?.(error, input);
    },
    ...rest,
  });
}

/** The gateway's reason in plain words: the error text it sent, or what the status means. */
export function describeError(e: unknown): string {
  const err = toApiError(e);
  if (err.status === 0) return err.error.startsWith('cannot reach') ? 'the server cannot be reached' : err.error;
  if (err.status === 401) return 'you are not signed in';
  if (err.status === 403) return 'your role may not do this';
  if (err.status === 501) return 'this part comes with the next release';
  if (err.status === 502 || err.status === 504) return 'a service behind the gateway did not answer';
  return err.error;
}
