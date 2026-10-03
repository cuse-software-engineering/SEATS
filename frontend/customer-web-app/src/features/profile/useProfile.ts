import { type CustomerProfile, useGet } from '@seats/frontend-shared';

/** The customer's stored details. Before the first booking the gateway answers 404: that is "no profile yet", not
 *  a failure, so the screen asks for the consent and the details. */
export function useProfile() {
  const query = useGet<CustomerProfile>(['profile'], '/api/customers/me', { retry: false });
  const missing = query.isError && query.error.status === 404;
  return {
    query,
    /** The stored details, or null when there are none yet. */
    profile: missing ? null : query.data ?? null,
    missing,
    loading: query.isPending,
    error: missing ? null : query.error,
  };
}
