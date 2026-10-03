// What a scenario needs other customers to have done already, through the gateway with the fake-auth headers of a
// customer, as the Customer Web App does it: a hold, a cancelled hold, a stored profile. The manager-side seed is
// helpers/seed.ts.
import { request, type APIRequestContext } from '@playwright/test';
import { GATEWAY } from './seed';

export const customerApi = (userId: string): Promise<APIRequestContext> =>
  request.newContext({ baseURL: GATEWAY, extraHTTPHeaders: { 'x-user-id': userId, 'x-role': 'customer' } });

async function call<T>(api: APIRequestContext, method: 'get' | 'post' | 'put', path: string, data?: unknown): Promise<T> {
  const r = await api[method](path, data === undefined ? undefined : { data });
  if (!r.ok()) throw new Error(`seed-customers: ${method.toUpperCase()} ${path} -> ${r.status()} ${await r.text()}`);
  return (await r.json()) as T;
}

/** Runs `fn` as the customer `userId` and disposes the context. */
export async function asCustomer<T>(userId: string, fn: (api: APIRequestContext) => Promise<T>): Promise<T> {
  const api = await customerApi(userId);
  try { return await fn(api); } finally { await api.dispose(); }
}

/** As `userId`, hold table `tableNumber` of the round (UC-01 step 6); answers the booking id. */
export const holdTableAs = (userId: string, roundId: string, tableNumber: number): Promise<string> =>
  asCustomer(userId, async (api) => (await call<{ id: string }>(api, 'post', '/api/bookings', { roundId, tableNumber })).id);

/** As `userId`, cancel the booking (UC-01 AF-4). */
export const cancelBookingAs = (userId: string, bookingId: string): Promise<void> =>
  asCustomer(userId, async (api) => { await call(api, 'post', `/api/bookings/${bookingId}/cancel`); });

/** One other customer per table (`${prefix}-${n}`) holds every table of the round, which the round list then
 *  shows as sold out. A hold lasts the hold period (15 minutes), long enough for a run. */
export async function holdEveryTableAs(prefix: string, roundId: string, tableNumbers: number[]): Promise<void> {
  for (const n of tableNumbers) await holdTableAs(`${prefix}-${n}`, roundId, n);
}

/** As `userId`, store the name and the phone with the consent (UC-09): a returning customer. */
export const createProfileAs = (userId: string, profile: { name: string; phone: string }): Promise<void> =>
  asCustomer(userId, async (api) => { await call(api, 'post', '/api/customers/me', { ...profile, consent: true }); });
