// Concert Round Service — the operations of Table 5.3 (MVP), one function each. No transport code here.
// Every operation is asynchronous: the Round DB (store.ts) answers promises, and a read answers a copy of the
// document, so an operation that changes what it read put()s it back.
import { randomUUID } from 'node:crypto';
import { collection } from './store.js';
import { adapters } from './adapters.js';
import { tableAvailability } from './clients.js';
import type { BusinessParameters, CheckInWindow, PackagePrice, Round, RoundTable, TableType, UpcomingRound, ValidationResult, Zone, ZoneMap, ZoneMapTable } from './model.js';

export class DomainError extends Error {
  constructor(public readonly status: 400 | 404 | 409 | 503, message: string, public readonly details?: unknown) { super(message); }
}

const zoneMaps = collection<ZoneMap>('zoneMaps');
const tableTypes = collection<TableType>('tableTypes');
const rounds = collection<Round>('rounds');
const settings = collection<BusinessParameters>('settings');

const DEFAULT_PARAMETERS: BusinessParameters = { holdPeriodMinutes: 15, checkInWindowHours: 2, gracePeriodMinutes: 30, extraPersonFee: 600 };   // BRULE-02, 04, 05, 09
const now = () => new Date();
const iso = (d: string | number | Date) => new Date(d).toISOString();

async function requireZoneMap(id: string): Promise<ZoneMap> {
  const m = await zoneMaps.get(id);
  if (!m) throw new DomainError(404, `zone map ${id} not found`);
  return m;
}
async function requireRound(id: string): Promise<Round> {
  const r = await rounds.get(id);
  if (!r) throw new DomainError(404, `round ${id} not found`);
  return r;
}

// ---------------------------------------------------------------- business parameters (FR-38)
export async function getBusinessParameters(): Promise<BusinessParameters> {
  return (await settings.get('parameters')) ?? (await settings.put('parameters', { ...DEFAULT_PARAMETERS }));
}

export async function updateBusinessParameters(patch: Partial<BusinessParameters>): Promise<BusinessParameters> {
  const p = { ...(await getBusinessParameters()) };
  for (const k of Object.keys(DEFAULT_PARAMETERS) as (keyof BusinessParameters)[]) {
    const v = patch[k];
    if (v === undefined) continue;
    if (!Number.isFinite(v) || v < 0) throw new DomainError(400, `${k} must be a non-negative number`);
    p[k] = v;
  }
  return settings.put('parameters', p);
}

// ---------------------------------------------------------------- table types (FR-37)
export async function defineTableType(id: string, { name, capacity, packageContent }: Partial<TableType>): Promise<TableType> {
  if (!id || !name || !Number.isInteger(capacity) || (capacity as number) < 1) throw new DomainError(400, 'id, name and a capacity of at least 1 are required');
  return tableTypes.put(id, { id, name, capacity: capacity as number, packageContent: packageContent ?? '' });
}
export const listTableTypes = (): Promise<TableType[]> => tableTypes.list();
const tableTypesById = async (): Promise<Map<string, TableType>> => new Map((await tableTypes.list()).map((t) => [t.id, t]));   // one read for a whole map

// ---------------------------------------------------------------- zone maps (UC-04)
export async function createZoneMap({ name }: { name?: string } = {}): Promise<ZoneMap> {           // UC-04 steps 1–2
  const map: ZoneMap = { id: randomUUID(), name: name ?? 'Untitled zone map', status: 'Draft', imageUrl: '', zones: [], tables: [], createdAt: iso(now()) };
  return zoneMaps.put(map.id, map);
}

export async function uploadZoneMapImage(id: string, { fileName }: { fileName?: string }): Promise<ZoneMap> {   // UC-04 step 3, EF-3
  const map = await requireZoneMap(id);
  if (!fileName) throw new DomainError(400, 'fileName is required');
  let url: string;
  try {
    ({ url } = await adapters.mediaStorage.store(id, fileName));                                   // the Media Storage Adapter (FR-39)
  } catch (e) {                                                                                    // EF-3: the map keeps its old image
    throw new DomainError(503, 'the image of the venue could not be stored; the zone map is unchanged', { external: 'Media Storage', reason: e instanceof Error ? e.message : String(e) });
  }
  map.imageUrl = url;
  return zoneMaps.put(id, map);
}

async function bookedTablesOfMap(mapId: string): Promise<Set<number>> {
  const numbers = new Set<number>();
  for (const r of await rounds.find({ status: 'Published', zoneMapId: mapId })) {
    const status = await tableAvailability.getRoundTableStatus(r.id).catch(() => ({ tables: [] }));
    for (const t of status.tables) if (['BOOKED', 'OCCUPIED'].includes(t.status)) numbers.add(t.tableNumber);
  }
  return numbers;
}

export interface ZoneMapPatch { name?: string; zones?: Partial<Zone>[]; tables?: Partial<ZoneMapTable>[] }

export async function updateZoneMap(id: string, { name, zones, tables }: ZoneMapPatch): Promise<ZoneMapView> {   // UC-04 steps 4–6, AF-1, AF-3
  const map = await requireZoneMap(id);
  if (map.status === 'Active') {                                                                  // AF-1: nothing that affects a booked table
    const booked = await bookedTablesOfMap(id);
    for (const n of booked) {
      const before = map.tables.find((t) => t.tableNumber === n);
      const after = (tables ?? map.tables).find((t) => t.tableNumber === n);
      if (!before || !after || after.zoneId !== before.zoneId || after.x !== before.x || after.y !== before.y) {
        throw new DomainError(409, `table ${n} has Confirmed bookings and cannot be removed or moved`, { bookedTables: [...booked] });
      }
    }
  }
  if (name !== undefined) map.name = name;
  if (zones !== undefined) map.zones = zones.map((z) => ({ id: z.id ?? randomUUID(), name: z.name ?? '' }));
  if (tables !== undefined) map.tables = tables.map((t) => ({ tableNumber: t.tableNumber ?? 0, zoneId: t.zoneId ?? '', tableTypeId: t.tableTypeId ?? '', capacity: t.capacity ?? 0, x: t.x ?? 0, y: t.y ?? 0 }));
  await zoneMaps.put(id, map);
  return getZoneMap(id);                                                                          // UC-04 step 7: tables and capacity per zone
}

export interface ZoneSummary { zoneId: string; name: string; tables: number; capacity: number }
export type ZoneMapView = ZoneMap & { summary: ZoneSummary[] };

const zoneSummary = (map: ZoneMap): ZoneSummary[] => map.zones.map((z) => {
  const ts = map.tables.filter((t) => t.zoneId === z.id);
  return { zoneId: z.id, name: z.name, tables: ts.length, capacity: ts.reduce((s, t) => s + (t.capacity ?? 0), 0) };
});

export const listZoneMaps = async ({ status }: { status?: string } = {}) =>
  (await zoneMaps.find(status ? { status: status as ZoneMap['status'] } : {})).map((m) => ({ id: m.id, name: m.name, status: m.status, tables: m.tables.length }));
export const getZoneMap = async (id: string): Promise<ZoneMapView> => { const m = await requireZoneMap(id); return { ...m, summary: zoneSummary(m) }; };   // UC-04 steps 7, 10; UC-03 step 7

export async function validateZoneMap(id: string): Promise<ValidationResult> {                     // UC-04 S-1 (FR-74)
  const map = await requireZoneMap(id);
  const types = await tableTypesById();
  const problems: string[] = [];
  for (const z of map.zones) {
    if (!z.name) problems.push(`zone ${z.id} has no name`);
    if (!map.tables.some((t) => t.zoneId === z.id)) problems.push(`zone ${z.name || z.id} has no table`);
  }
  const seen = new Set<number>();
  for (const t of map.tables) {
    if (seen.has(t.tableNumber)) problems.push(`table number ${t.tableNumber} is used twice`);
    seen.add(t.tableNumber);
    if (!t.tableTypeId || !types.has(t.tableTypeId)) problems.push(`table ${t.tableNumber} has no table type`);
    if (!Number.isInteger(t.capacity) || t.capacity < 1) problems.push(`table ${t.tableNumber} has no seating capacity`);
    if (!map.zones.some((z) => z.id === t.zoneId)) problems.push(`table ${t.tableNumber} is in no zone`);
  }
  if (!map.zones.length) problems.push('the map has no zone');
  return { valid: problems.length === 0, problems };
}

export async function activateZoneMap(id: string): Promise<ZoneMap> {                             // UC-04 steps 11–12, EF-2 (idempotent)
  const map = await requireZoneMap(id);
  if (map.status === 'Active') return map;
  const v = await validateZoneMap(id);
  if (!v.valid) throw new DomainError(400, 'the zone map is not valid', v.problems);
  map.status = 'Active';
  return zoneMaps.put(id, map);
}

export async function discardDraftZoneMap(id: string): Promise<{ removed: boolean }> {             // D of CRUD
  const map = await requireZoneMap(id);
  if (map.status !== 'Draft') throw new DomainError(409, 'only a Draft zone map can be discarded');
  await zoneMaps.delete(id);
  return { removed: true };
}

// ---------------------------------------------------------------- rounds (UC-03)
function deriveCheckInWindow(startAt: string, p: BusinessParameters): CheckInWindow | null {       // UC-03 step 5 (BRULE-04, BRULE-05)
  if (!startAt) return null;
  const s = new Date(startAt).getTime();
  return { opensAt: iso(s - p.checkInWindowHours * 3600e3), startAt: iso(s), graceEndsAt: iso(s + p.gracePeriodMinutes * 60e3) };
}

export async function createRound({ name }: { name?: string } = {}): Promise<Round> {               // UC-03 steps 1–2
  const r: Round = { id: randomUUID(), name: name ?? 'Untitled round', artist: '', status: 'Draft', date: '', doorsOpenAt: '', startAt: '', bookingOpenAt: '', zoneMapId: '', tablesNotForSale: [], prices: [], checkInWindow: null, parameters: null, createdAt: iso(now()) };
  return rounds.put(r.id, r);
}

export type RoundPatch = Partial<Pick<Round, 'name' | 'artist' | 'date' | 'doorsOpenAt' | 'startAt' | 'bookingOpenAt' | 'zoneMapId' | 'tablesNotForSale' | 'prices'>>;
const ROUND_FIELDS = ['name', 'artist', 'date', 'doorsOpenAt', 'startAt', 'bookingOpenAt', 'zoneMapId', 'tablesNotForSale', 'prices'] as const;
type RoundField = (typeof ROUND_FIELDS)[number];

function applyPatch(r: Round, patch: RoundPatch, fields: readonly RoundField[]) {
  for (const f of fields) {
    const v = patch[f];
    if (v !== undefined) (r as unknown as Record<RoundField, unknown>)[f] = v;
  }
}

/** UC-03 steps 3–10, AF-1 (Draft: any field) and AF-3 (Published: only what BRULE-07 allows after the booking-open time). */
export async function updateRound(id: string, patch: RoundPatch): Promise<Round & { confirmedBookings?: number }> {
  const r = await requireRound(id);
  if (r.status === 'Draft') {
    applyPatch(r, patch, ROUND_FIELDS);
    r.checkInWindow = deriveCheckInWindow(r.startAt, await getBusinessParameters());
    return rounds.put(id, r);
  }
  const bookingOpen = !!r.bookingOpenAt && new Date(r.bookingOpenAt) <= now();
  const status = await tableAvailability.getRoundTableStatus(id);
  const booked = status.tables.filter((t) => ['BOOKED', 'OCCUPIED'].includes(t.status)).length;
  const allowed: readonly RoundField[] = !bookingOpen ? ROUND_FIELDS : booked === 0 ? ['name', 'artist', 'date', 'doorsOpenAt', 'startAt'] : ['name', 'artist'];
  const refused = (Object.keys(patch) as RoundField[]).filter((k) => ROUND_FIELDS.includes(k) && !allowed.includes(k));
  if (refused.length) throw new DomainError(409, `after the booking-open time these fields are fixed: ${refused.join(', ')}`, { confirmedBookings: booked });
  const before = { zoneMapId: r.zoneMapId, tablesNotForSale: [...r.tablesNotForSale] };
  applyPatch(r, patch, allowed);
  r.checkInWindow = deriveCheckInWindow(r.startAt, r.parameters ?? (await getBusinessParameters()));
  if (r.zoneMapId !== before.zoneMapId || r.tablesNotForSale.join() !== before.tablesNotForSale.join()) {   // AF-3 step 2, before booking opens: the table map follows
    await tableAvailability.removeRoundTableStatus(id);
    await tableAvailability.createRoundTableStatus({ roundId: id, tables: (await tablesOf(r)).map((t) => ({ tableNumber: t.tableNumber, forSale: t.forSale })) });
  }
  return { ...(await rounds.put(id, r)), confirmedBookings: booked };
}

async function tablesOf(r: Round): Promise<RoundTable[]> {                                        // tables of the round with zone, type, price
  const map = await zoneMaps.get(r.zoneMapId);
  if (!map) return [];
  const types = await tableTypesById();
  return map.tables.map((t) => {
    const zone = map.zones.find((z) => z.id === t.zoneId);
    const type = types.get(t.tableTypeId);
    const price: PackagePrice | undefined = r.prices.find((p) => p.zoneId === t.zoneId && p.tableTypeId === t.tableTypeId);
    return { tableNumber: t.tableNumber, zoneId: t.zoneId, zoneName: zone?.name ?? '', tableTypeId: t.tableTypeId, tableTypeName: type?.name ?? '', capacity: t.capacity, x: t.x, y: t.y, forSale: !r.tablesNotForSale.includes(t.tableNumber), packagePrice: price?.packagePrice ?? null, packageContent: price?.packageContent ?? '' };
  });
}

export async function validateRound(id: string): Promise<ValidationResult> {                      // UC-03 S-1 (FR-75)
  const r = await requireRound(id);
  const problems: string[] = [];
  const t = (v: string) => (v ? new Date(v).getTime() : NaN);
  if (!r.date || !r.startAt || !r.doorsOpenAt || !r.bookingOpenAt) problems.push('date, doors-open time, start time and booking-open time are required');
  else {
    if (!(t(r.doorsOpenAt) < t(r.startAt))) problems.push('the doors-open time must be before the start time');
    if (!(t(r.bookingOpenAt) < t(r.startAt))) problems.push('the booking-open time must be before the start time');
  }
  const map = await zoneMaps.get(r.zoneMapId);
  if (!map) problems.push('the round has no zone map');
  else if (map.status !== 'Active') problems.push('the zone map is not Active');
  for (const tb of (await tablesOf(r)).filter((x) => x.forSale)) {
    if (tb.packagePrice === null) problems.push(`no package price for ${tb.tableTypeName || tb.tableTypeId} in ${tb.zoneName || tb.zoneId}`);
  }
  if (r.startAt && r.doorsOpenAt) {
    const mine = [t(r.doorsOpenAt), r.checkInWindow ? t(r.checkInWindow.graceEndsAt) : t(r.startAt)];
    for (const o of (await rounds.find({ status: 'Published' })).filter((o) => o.id !== id && o.startAt)) {
      const theirs = [t(o.doorsOpenAt || o.startAt), o.checkInWindow ? t(o.checkInWindow.graceEndsAt) : t(o.startAt)];
      if (mine[0] < theirs[1] && theirs[0] < mine[1]) problems.push(`overlaps the published round "${o.name}"`);
    }
  }
  const unique = [...new Set(problems)];
  return { valid: unique.length === 0, problems: unique };
}

export async function publishRound(id: string): Promise<Round> {                                  // UC-03 steps 14–15, EF-2 (idempotent)
  const r = await requireRound(id);
  if (r.status === 'Published') return r;
  const v = await validateRound(id);
  if (!v.valid) throw new DomainError(400, 'the round is not valid', v.problems);
  r.parameters = { ...(await getBusinessParameters()) };                                         // the values in force for this round (FR-38)
  r.checkInWindow = deriveCheckInWindow(r.startAt, r.parameters);
  await tableAvailability.createRoundTableStatus({ roundId: id, tables: (await tablesOf(r)).map((t) => ({ tableNumber: t.tableNumber, forSale: t.forSale })) });
  r.status = 'Published';
  return rounds.put(id, r);
}

export async function discardDraftRound(id: string): Promise<{ removed: boolean }> {               // D of CRUD
  const r = await requireRound(id);
  if (r.status !== 'Draft') throw new DomainError(409, 'only a Draft round can be discarded');
  await rounds.delete(id);
  return { removed: true };
}

export async function getUpcomingRounds(): Promise<UpcomingRound[]> {                              // UC-01 step 3 (FR-03), AF-1, AF-2
  const today = iso(now()).slice(0, 10);
  const list = (await rounds.find({ status: 'Published' })).filter((r) => r.date >= today).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const counts = list.length ? (await tableAvailability.countAvailableTables(list.map((r) => r.id))).counts : [];
  return list.map((r) => {
    const c = counts.find((x) => x.roundId === r.id) ?? { available: 0, forSale: 0 };
    const status = new Date(r.bookingOpenAt) > now() ? 'not yet open' : c.available === 0 ? 'sold out' : 'open';
    return { id: r.id, name: r.name, artist: r.artist, date: r.date, startAt: r.startAt, bookingOpenAt: r.bookingOpenAt, status, availableTables: c.available, tablesForSale: c.forSale };
  });
}

export const getRound = async (id: string): Promise<Round & { holdPeriodMinutes: number }> => {
  const r = await requireRound(id);
  return { ...r, holdPeriodMinutes: (r.parameters ?? (await getBusinessParameters())).holdPeriodMinutes };
};
export const getRoundTables = async (id: string): Promise<RoundTable[]> => tablesOf(await requireRound(id));   // UC-01 step 5 (FR-05)

export async function getRoundPricing(id: string) {                                                // Booking: setPartySize() computes the fee from it
  const r = await requireRound(id);
  return { roundId: id, prices: r.prices, extraPersonFee: (r.parameters ?? (await getBusinessParameters())).extraPersonFee };
}

export async function getCheckInWindow(id: string) {                                               // Booking: terms (UC-01 step 13), verification (UC-02)
  const r = await requireRound(id);
  if (!r.checkInWindow) throw new DomainError(409, 'the round has no start time yet');
  return { roundId: id, ...r.checkInWindow };
}
