// Seeds the backend through the API Gateway as the manager with the fake-auth headers, as demo/smoke.mjs does, so
// that the customer tests find a Published round on an Active zone map. Every run uses fresh names, its own table
// types and free future days (a Published round refuses to overlap another one), so runs never step on each other.
import { request, type APIRequestContext } from '@playwright/test';

export const GATEWAY = process.env.GATEWAY ?? 'http://localhost:4000';

/** A short random tag that makes every name of a run unique. */
export const tag = (): string => Math.random().toString(36).slice(2, 8);

export const SOFA6 = { id: 'e2e-sofa6', name: '6-person sofa', capacity: 6 };
export const ROUND2 = { id: 'e2e-round2', name: '2-person round table', capacity: 2 };
export const ZONE = { id: 'A', name: 'Front stage' };
export const PRICES = { [SOFA6.id]: 7200, [ROUND2.id]: 2400 };
/** The four tables of the seeded map: #1 and #4 are sofas, #2 and #3 round tables. */
export const TABLES = [
  { tableNumber: 1, zoneId: ZONE.id, tableTypeId: SOFA6.id, capacity: SOFA6.capacity },
  { tableNumber: 2, zoneId: ZONE.id, tableTypeId: ROUND2.id, capacity: ROUND2.capacity },
  { tableNumber: 3, zoneId: ZONE.id, tableTypeId: ROUND2.id, capacity: ROUND2.capacity },
  { tableNumber: 4, zoneId: ZONE.id, tableTypeId: SOFA6.id, capacity: SOFA6.capacity },
];

export interface SeededMap { id: string; name: string }
export interface SeededRound { id: string; name: string; date: string; bookingOpenAt: string }

export const managerApi = (): Promise<APIRequestContext> =>
  request.newContext({ baseURL: GATEWAY, extraHTTPHeaders: { 'x-user-id': 'manager-e2e', 'x-role': 'manager' } });

async function call<T>(api: APIRequestContext, method: 'get' | 'post' | 'put' | 'delete', path: string, data?: unknown): Promise<T> {
  const r = await api[method](path, data === undefined ? undefined : { data });
  if (!r.ok()) throw new Error(`seed: ${method.toUpperCase()} ${path} -> ${r.status()} ${await r.text()}`);
  return (await r.json()) as T;
}

/** Table types, one zone map with one zone and four tables, activated (UC-04 through the API). */
export async function seedZoneMap(api: APIRequestContext, t: string): Promise<SeededMap> {
  await call(api, 'put', `/api/table-types/${SOFA6.id}`, { name: SOFA6.name, capacity: SOFA6.capacity });
  await call(api, 'put', `/api/table-types/${ROUND2.id}`, { name: ROUND2.name, capacity: ROUND2.capacity });
  const map = await call<{ id: string }>(api, 'post', '/api/zone-maps', { name: `E2E hall ${t}` });
  await call(api, 'post', `/api/zone-maps/${map.id}/image`, { fileName: 'hall.png' });
  await call(api, 'put', `/api/zone-maps/${map.id}`, { zones: [ZONE], tables: TABLES });
  await call(api, 'post', `/api/zone-maps/${map.id}/activate`);
  return { id: map.id, name: `E2E hall ${t}` };
}

const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** `n` distinct future days (2 to 3000 days ahead) on which no upcoming Published round exists yet. */
export async function freeDays(api: APIRequestContext, n: number): Promise<string[]> {
  const taken = new Set((await call<{ date?: string }[]>(api, 'get', '/api/rounds')).map((r) => r.date));
  const days: string[] = [];
  while (days.length < n) {
    const day = isoDay(Date.now() + (2 + Math.floor(Math.random() * 3000)) * 864e5);
    if (!taken.has(day) && !days.includes(day)) days.push(day);
  }
  return days;
}

/** A Published round on the seeded map, doors 18:00Z, start 20:00Z of `day`; open for booking since a minute ago
 *  unless `bookingOpenAt` says otherwise (UC-01 AF-1 needs one that opens later). */
export async function seedRound(api: APIRequestContext, mapId: string, o: { name: string; day: string; bookingOpenAt?: string }): Promise<SeededRound> {
  const bookingOpenAt = o.bookingOpenAt ?? new Date(Date.now() - 60e3).toISOString();
  const round = await call<{ id: string }>(api, 'post', '/api/rounds', { name: o.name });
  await call(api, 'put', `/api/rounds/${round.id}`, {
    artist: 'The E2E Band', date: o.day, doorsOpenAt: `${o.day}T18:00:00Z`, startAt: `${o.day}T20:00:00Z`, bookingOpenAt, zoneMapId: mapId,
    prices: [{ zoneId: ZONE.id, tableTypeId: SOFA6.id, packagePrice: PRICES[SOFA6.id] }, { zoneId: ZONE.id, tableTypeId: ROUND2.id, packagePrice: PRICES[ROUND2.id] }],
  });
  await call(api, 'post', `/api/rounds/${round.id}/publish`);
  return { id: round.id, name: o.name, date: o.day, bookingOpenAt };
}

/** Money as the web apps show it (frontend/shared/src/format.ts). */
export const thb = (n: number): string => `฿${n.toLocaleString('en-US')}`;
