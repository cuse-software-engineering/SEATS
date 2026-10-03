// Shared harness of the scenario tests (one file per use case of the project document, Section 2.2): the fetch helper
// with the fake-auth headers of progress 1 and the fixtures that every scenario starts from, built through the REST
// routes exactly as the Back-office Web App would build them. Two targets:
//  - in-process (default, `npm test`): the API Gateway and the six services in this process (ADR-14) on an ephemeral
//    port; each test file is its own process (node --test), so the stores start empty;
//  - over the network (`GATEWAY=http://host:4000`, `npm run test:api`): a running system, microservice mode, docker
//    compose or a deployment; the data persists between files and runs, so every fixture is fresh (its own LINE user,
//    its own zone map, its own far-future day) and the tests that drive a service from inside the process are skipped.
import { randomUUID, randomInt } from 'node:crypto';
import { after, before } from 'node:test';
import type { AddressInfo } from 'node:net';

export const GATEWAY = (process.env.GATEWAY ?? '').replace(/\/$/, '');
export const EXTERNAL = GATEWAY !== '';
/** The option bag of a scenario that reaches into the process (the hold-expiry job with a shifted clock, an adapter's
 *  failNext): it runs in-process only and is skipped over the network with the reason in the report. */
export const inProcessOnly = (why: string) => ({ skip: EXTERNAL ? `in-process only: ${why}` : false });

let url = GATEWAY;
if (!EXTERNAL) {
  const { wireMonolith } = await import('../../src/wire.js');
  await wireMonolith();                                             // before the route table binds the client methods
  const { createApp } = await import('@seats/gateway/src/app.js');
  const server = createApp().listen(0);
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const stores = await Promise.all([import('@seats/concert-round/src/infrastructure/index.js'), import('@seats/table-availability/src/infrastructure/index.js'), import('@seats/booking/src/infrastructure/index.js')]);
  after(() => server.close());
  before(async () => { for (const s of stores) await s.resetStore(); });
}
export const G = () => url;

// ---------------------------------------------------------------- identities (fake auth, progress 1)
export type Headers = Record<string, string>;
export const H = (userId: string, role: string): Headers => ({ 'x-user-id': userId, 'x-role': role, 'content-type': 'application/json' });
export const manager = H('manager-nok', 'manager');
export const frontStaff = H('door1', 'front_staff');
export const anonymous: Headers = { 'content-type': 'application/json' };   // no LINE identity (UC-01 EF-2)
let customers = 0;
/** A fresh LINE user for one scenario, so that profiles and bookings of the tests never meet. */
export const customer = (name = 'U'): Headers => H(`${name}-${++customers}-${randomUUID().slice(0, 8)}`, 'customer');

// ---------------------------------------------------------------- the fetch helper
export interface Reply { status: number; json: any; etag: string | null }
export async function call(headers: Headers, method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<Reply> {
  const r = await fetch(G() + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, json: r.status === 304 ? null : await r.json().catch(() => null), etag: r.headers.get('etag') };
}
/** The polled read of the table map (ADR-09); with an ETag the answer is 304 when nothing changed. */
export const poll = (headers: Headers, roundId: string, etag?: string) =>
  call(etag ? { ...headers, 'if-none-match': etag } : headers, 'GET', `/api/rounds/${roundId}/table-status`);
/** One table of the polled map. */
export const tableStatus = async (headers: Headers, roundId: string, tableNumber: number) =>
  (await poll(headers, roundId)).json.tables.find((t: any) => t.tableNumber === tableNumber);

// ---------------------------------------------------------------- dates: random future days as in demo/smoke.mjs, one day per round
// In-process the stores are empty, so a window of 300 days keeps the overlap check of validateRound() quiet. Over the
// network the files share one system and earlier runs left their rounds behind, so each process takes a random base in
// a window of 100,000 days: two processes land on the same day about once in a thousand runs.
const base = EXTERNAL ? randomInt(2, 100_000) : 2 + Math.floor(Math.random() * 300);
let days = 0;
export const futureDay = (): string => new Date(Date.now() + (base + days++) * 864e5).toISOString().slice(0, 10);
export const at = (day: string, hh: string) => `${day}T${hh}:00:00Z`;
export const minutesFromNow = (m: number) => new Date(Date.now() + m * 60e3).toISOString();
/** The schedule of a round on `day`: doors 18:00, start 20:00, booking open one minute ago unless given. */
export const schedule = (day: string, bookingOpenAt = minutesFromNow(-1)) => ({ date: day, doorsOpenAt: at(day, '18'), startAt: at(day, '20'), bookingOpenAt });

// ---------------------------------------------------------------- fixtures, through the routes of the Back-office Web App (Appendix D)
export const SOFA6 = { id: 'sofa6', name: '6-person sofa', capacity: 6 };
export const ROUND2 = { id: 'round2', name: '2-person round table', capacity: 2 };
export const PRICES = [{ zoneId: 'A', tableTypeId: 'sofa6', packagePrice: 7200, packageContent: 'sofa, 2 bottles' }, { zoneId: 'A', tableTypeId: 'round2', packagePrice: 2400, packageContent: 'round table, 1 bottle' }];
/** Tables 1 (sofa6, capacity 6) and 2 (round2, capacity 2) in Zone A, with their positions on the image. */
export const TABLES = [{ tableNumber: 1, zoneId: 'A', tableTypeId: 'sofa6', capacity: 6, x: 10, y: 20 }, { tableNumber: 2, zoneId: 'A', tableTypeId: 'round2', capacity: 2, x: 40, y: 20 }];

export async function defineTableTypes(): Promise<void> {                                   // UC-04 steps 5–6 (FR-37); PUT is idempotent
  for (const t of [SOFA6, ROUND2]) {
    const r = await call(manager, 'PUT', `/api/table-types/${t.id}`, { name: t.name, capacity: t.capacity });
    if (r.status !== 200) throw new Error(`fixture: table type ${t.id} -> ${r.status} ${JSON.stringify(r.json)}`);
  }
}

/** An Active zone map (UC-04 basic flow) with Zone A and tables 1 and 2. */
export async function activeZoneMap(name = 'Main hall'): Promise<any> {
  await defineTableTypes();
  const created = await call(manager, 'POST', '/api/zone-maps', { name });
  const id = created.json.id;
  await call(manager, 'POST', `/api/zone-maps/${id}/image`, { fileName: 'hall.png' });
  await call(manager, 'PUT', `/api/zone-maps/${id}`, { zones: [{ id: 'A', name: 'Zone A' }], tables: TABLES });
  const active = await call(manager, 'POST', `/api/zone-maps/${id}/activate`);
  if (active.status !== 200) throw new Error(`fixture: activate zone map -> ${active.status} ${JSON.stringify(active.json)}`);
  return active.json;
}

export interface RoundOptions { name?: string; bookingOpenAt?: string; tablesNotForSale?: number[]; zoneMapId?: string; publish?: boolean }
/** A Published round (UC-03 basic flow) on its own future day, open for booking one minute ago unless told otherwise. */
export async function publishedRound(options: RoundOptions = {}): Promise<{ round: any; day: string; mapId: string }> {
  const mapId = options.zoneMapId ?? (await activeZoneMap()).id;
  const day = futureDay();
  const created = await call(manager, 'POST', '/api/rounds', { name: options.name ?? `Friday Live ${day}` });
  const id = created.json.id;
  const details = await call(manager, 'PUT', `/api/rounds/${id}`, { artist: 'The Band', ...schedule(day, options.bookingOpenAt), zoneMapId: mapId, tablesNotForSale: options.tablesNotForSale ?? [], prices: PRICES });
  if (details.status !== 200) throw new Error(`fixture: round details -> ${details.status} ${JSON.stringify(details.json)}`);
  if (options.publish === false) return { round: details.json, day, mapId };
  const published = await call(manager, 'POST', `/api/rounds/${id}/publish`);
  if (published.status !== 200) throw new Error(`fixture: publish -> ${published.status} ${JSON.stringify(published.json)}`);
  return { round: published.json, day, mapId };
}

/** A Held booking of `who` on a table of the round (UC-01 steps 6–8). */
export async function heldBooking(who: Headers, roundId: string, tableNumber = 1): Promise<any> {
  const held = await call(who, 'POST', '/api/bookings', { roundId, tableNumber });
  if (held.status !== 200) throw new Error(`fixture: hold table ${tableNumber} -> ${held.status} ${JSON.stringify(held.json)}`);
  return held.json;
}
