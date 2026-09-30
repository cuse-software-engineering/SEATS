// Concert Round Service — the operations of Table 5.3 (MVP), one function each. No transport code here.
import { randomUUID } from 'node:crypto';
import { collection } from './store.js';
import { tableAvailability } from './clients.js';
import type { BusinessParameters, CheckInWindow, PackagePrice, Round, RoundTable, TableType, UpcomingRound, ValidationResult, Zone, ZoneMap, ZoneMapTable } from './model.js';

export class DomainError extends Error {
  constructor(public readonly status: 400 | 404 | 409, message: string, public readonly details?: unknown) { super(message); }
}

const zoneMaps = collection<ZoneMap>('zoneMaps');
const tableTypes = collection<TableType>('tableTypes');
const rounds = collection<Round>('rounds');
const settings = collection<BusinessParameters>('settings');

const DEFAULT_PARAMETERS: BusinessParameters = { holdPeriodMinutes: 15, checkInWindowHours: 2, gracePeriodMinutes: 30, extraPersonFee: 600 };   // BRULE-02, 04, 05, 09
const now = () => new Date();
const iso = (d: string | number | Date) => new Date(d).toISOString();

function requireZoneMap(id: string): ZoneMap {
  const m = zoneMaps.get(id);
  if (!m) throw new DomainError(404, `zone map ${id} not found`);
  return m;
}
function requireRound(id: string): Round {
  const r = rounds.get(id);
  if (!r) throw new DomainError(404, `round ${id} not found`);
  return r;
}

// ---------------------------------------------------------------- business parameters (FR-38)
export function getBusinessParameters(): BusinessParameters {
  return settings.get('parameters') ?? settings.put('parameters', { ...DEFAULT_PARAMETERS });
}

export function updateBusinessParameters(patch: Partial<BusinessParameters>): BusinessParameters {
  const p = { ...getBusinessParameters() };
  for (const k of Object.keys(DEFAULT_PARAMETERS) as (keyof BusinessParameters)[]) {
    const v = patch[k];
    if (v === undefined) continue;
    if (!Number.isFinite(v) || v < 0) throw new DomainError(400, `${k} must be a non-negative number`);
    p[k] = v;
  }
  return settings.put('parameters', p);
}

// ---------------------------------------------------------------- table types (FR-37)
export function defineTableType(id: string, { name, capacity, packageContent }: Partial<TableType>): TableType {
  if (!id || !name || !Number.isInteger(capacity) || (capacity as number) < 1) throw new DomainError(400, 'id, name and a capacity of at least 1 are required');
  return tableTypes.put(id, { id, name, capacity: capacity as number, packageContent: packageContent ?? '' });
}
export const listTableTypes = (): TableType[] => tableTypes.list();

// ---------------------------------------------------------------- zone maps (UC-04)
export function createZoneMap({ name }: { name?: string } = {}): ZoneMap {                        // UC-04 steps 1–2
  const map: ZoneMap = { id: randomUUID(), name: name ?? 'Untitled zone map', status: 'Draft', imageUrl: '', zones: [], tables: [], createdAt: iso(now()) };
  return zoneMaps.put(map.id, map);
}

export function uploadZoneMapImage(id: string, { fileName }: { fileName?: string }): ZoneMap {     // UC-04 step 3, EF-3
  const map = requireZoneMap(id);
  if (!fileName) throw new DomainError(400, 'fileName is required');
  map.imageUrl = `https://storage.example/zone-maps/${id}/${fileName}`;                           // Media Storage Adapter stub (storeZoneMapImage)
  return zoneMaps.put(id, map);
}

async function bookedTablesOfMap(mapId: string): Promise<Set<number>> {
  const numbers = new Set<number>();
  for (const r of rounds.list().filter((r) => r.status === 'Published' && r.zoneMapId === mapId)) {
    const status = await tableAvailability.getRoundTableStatus(r.id).catch(() => ({ tables: [] }));
    for (const t of status.tables) if (['BOOKED', 'OCCUPIED'].includes(t.status)) numbers.add(t.tableNumber);
  }
  return numbers;
}

export interface ZoneMapPatch { name?: string; zones?: Partial<Zone>[]; tables?: Partial<ZoneMapTable>[] }

export async function updateZoneMap(id: string, { name, zones, tables }: ZoneMapPatch): Promise<ZoneMapView> {   // UC-04 steps 4–6, AF-1, AF-3
  const map = requireZoneMap(id);
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
  zoneMaps.put(id, map);
  return getZoneMap(id);                                                                          // UC-04 step 7: tables and capacity per zone
}

export interface ZoneSummary { zoneId: string; name: string; tables: number; capacity: number }
export type ZoneMapView = ZoneMap & { summary: ZoneSummary[] };

const zoneSummary = (map: ZoneMap): ZoneSummary[] => map.zones.map((z) => {
  const ts = map.tables.filter((t) => t.zoneId === z.id);
  return { zoneId: z.id, name: z.name, tables: ts.length, capacity: ts.reduce((s, t) => s + (t.capacity ?? 0), 0) };
});

export const listZoneMaps = ({ status }: { status?: string } = {}) =>
  zoneMaps.list().filter((m) => !status || m.status === status).map((m) => ({ id: m.id, name: m.name, status: m.status, tables: m.tables.length }));
export const getZoneMap = (id: string): ZoneMapView => { const m = requireZoneMap(id); return { ...m, summary: zoneSummary(m) }; };   // UC-04 steps 7, 10; UC-03 step 7

export function validateZoneMap(id: string): ValidationResult {                                    // UC-04 S-1 (FR-74)
  const map = requireZoneMap(id);
  const problems: string[] = [];
  for (const z of map.zones) {
    if (!z.name) problems.push(`zone ${z.id} has no name`);
    if (!map.tables.some((t) => t.zoneId === z.id)) problems.push(`zone ${z.name || z.id} has no table`);
  }
  const seen = new Set<number>();
  for (const t of map.tables) {
    if (seen.has(t.tableNumber)) problems.push(`table number ${t.tableNumber} is used twice`);
    seen.add(t.tableNumber);
    if (!t.tableTypeId || !tableTypes.get(t.tableTypeId)) problems.push(`table ${t.tableNumber} has no table type`);
    if (!Number.isInteger(t.capacity) || t.capacity < 1) problems.push(`table ${t.tableNumber} has no seating capacity`);
    if (!map.zones.some((z) => z.id === t.zoneId)) problems.push(`table ${t.tableNumber} is in no zone`);
  }
  if (!map.zones.length) problems.push('the map has no zone');
  return { valid: problems.length === 0, problems };
}

export function activateZoneMap(id: string): ZoneMap {                                            // UC-04 steps 11–12, EF-2 (idempotent)
  const map = requireZoneMap(id);
  if (map.status === 'Active') return map;
  const v = validateZoneMap(id);
  if (!v.valid) throw new DomainError(400, 'the zone map is not valid', v.problems);
  map.status = 'Active';
  return zoneMaps.put(id, map);
}

export function discardDraftZoneMap(id: string): { removed: boolean } {                            // D of CRUD
  const map = requireZoneMap(id);
  if (map.status !== 'Draft') throw new DomainError(409, 'only a Draft zone map can be discarded');
  zoneMaps.delete(id);
  return { removed: true };
}

// ---------------------------------------------------------------- rounds (UC-03)
function deriveCheckInWindow(startAt: string, p: BusinessParameters): CheckInWindow | null {       // UC-03 step 5 (BRULE-04, BRULE-05)
  if (!startAt) return null;
  const s = new Date(startAt).getTime();
  return { opensAt: iso(s - p.checkInWindowHours * 3600e3), startAt: iso(s), graceEndsAt: iso(s + p.gracePeriodMinutes * 60e3) };
}

export function createRound({ name }: { name?: string } = {}): Round {                            // UC-03 steps 1–2
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
  const r = requireRound(id);
  if (r.status === 'Draft') {
    applyPatch(r, patch, ROUND_FIELDS);
    r.checkInWindow = deriveCheckInWindow(r.startAt, getBusinessParameters());
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
  r.checkInWindow = deriveCheckInWindow(r.startAt, r.parameters ?? getBusinessParameters());
  if (r.zoneMapId !== before.zoneMapId || r.tablesNotForSale.join() !== before.tablesNotForSale.join()) {   // AF-3 step 2, before booking opens: the table map follows
    await tableAvailability.removeRoundTableStatus(id);
    await tableAvailability.createRoundTableStatus({ roundId: id, tables: tablesOf(r).map((t) => ({ tableNumber: t.tableNumber, forSale: t.forSale })) });
  }
  return { ...rounds.put(id, r), confirmedBookings: booked };
}

function tablesOf(r: Round): RoundTable[] {                                                       // tables of the round with zone, type, price
  const map = zoneMaps.get(r.zoneMapId);
  if (!map) return [];
  return map.tables.map((t) => {
    const zone = map.zones.find((z) => z.id === t.zoneId);
    const type = tableTypes.get(t.tableTypeId);
    const price: PackagePrice | undefined = r.prices.find((p) => p.zoneId === t.zoneId && p.tableTypeId === t.tableTypeId);
    return { tableNumber: t.tableNumber, zoneId: t.zoneId, zoneName: zone?.name ?? '', tableTypeId: t.tableTypeId, tableTypeName: type?.name ?? '', capacity: t.capacity, x: t.x, y: t.y, forSale: !r.tablesNotForSale.includes(t.tableNumber), packagePrice: price?.packagePrice ?? null, packageContent: price?.packageContent ?? '' };
  });
}

export function validateRound(id: string): ValidationResult {                                     // UC-03 S-1 (FR-75)
  const r = requireRound(id);
  const problems: string[] = [];
  const t = (v: string) => (v ? new Date(v).getTime() : NaN);
  if (!r.date || !r.startAt || !r.doorsOpenAt || !r.bookingOpenAt) problems.push('date, doors-open time, start time and booking-open time are required');
  else {
    if (!(t(r.doorsOpenAt) < t(r.startAt))) problems.push('the doors-open time must be before the start time');
    if (!(t(r.bookingOpenAt) < t(r.startAt))) problems.push('the booking-open time must be before the start time');
  }
  const map = zoneMaps.get(r.zoneMapId);
  if (!map) problems.push('the round has no zone map');
  else if (map.status !== 'Active') problems.push('the zone map is not Active');
  for (const tb of tablesOf(r).filter((x) => x.forSale)) {
    if (tb.packagePrice === null) problems.push(`no package price for ${tb.tableTypeName || tb.tableTypeId} in ${tb.zoneName || tb.zoneId}`);
  }
  if (r.startAt && r.doorsOpenAt) {
    const mine = [t(r.doorsOpenAt), r.checkInWindow ? t(r.checkInWindow.graceEndsAt) : t(r.startAt)];
    for (const o of rounds.list().filter((o) => o.id !== id && o.status === 'Published' && o.startAt)) {
      const theirs = [t(o.doorsOpenAt || o.startAt), o.checkInWindow ? t(o.checkInWindow.graceEndsAt) : t(o.startAt)];
      if (mine[0] < theirs[1] && theirs[0] < mine[1]) problems.push(`overlaps the published round "${o.name}"`);
    }
  }
  const unique = [...new Set(problems)];
  return { valid: unique.length === 0, problems: unique };
}

export async function publishRound(id: string): Promise<Round> {                                  // UC-03 steps 14–15, EF-2 (idempotent)
  const r = requireRound(id);
  if (r.status === 'Published') return r;
  const v = validateRound(id);
  if (!v.valid) throw new DomainError(400, 'the round is not valid', v.problems);
  r.parameters = { ...getBusinessParameters() };                                                 // the values in force for this round (FR-38)
  r.checkInWindow = deriveCheckInWindow(r.startAt, r.parameters);
  await tableAvailability.createRoundTableStatus({ roundId: id, tables: tablesOf(r).map((t) => ({ tableNumber: t.tableNumber, forSale: t.forSale })) });
  r.status = 'Published';
  return rounds.put(id, r);
}

export function discardDraftRound(id: string): { removed: boolean } {                              // D of CRUD
  const r = requireRound(id);
  if (r.status !== 'Draft') throw new DomainError(409, 'only a Draft round can be discarded');
  rounds.delete(id);
  return { removed: true };
}

export async function getUpcomingRounds(): Promise<UpcomingRound[]> {                              // UC-01 step 3 (FR-03), AF-1, AF-2
  const today = iso(now()).slice(0, 10);
  const list = rounds.list().filter((r) => r.status === 'Published' && r.date >= today).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const counts = list.length ? (await tableAvailability.countAvailableTables(list.map((r) => r.id))).counts : [];
  return list.map((r) => {
    const c = counts.find((x) => x.roundId === r.id) ?? { available: 0, forSale: 0 };
    const status = new Date(r.bookingOpenAt) > now() ? 'not yet open' : c.available === 0 ? 'sold out' : 'open';
    return { id: r.id, name: r.name, artist: r.artist, date: r.date, startAt: r.startAt, bookingOpenAt: r.bookingOpenAt, status, availableTables: c.available, tablesForSale: c.forSale };
  });
}

export const getRound = (id: string): Round & { holdPeriodMinutes: number } => {
  const r = requireRound(id);
  return { ...r, holdPeriodMinutes: (r.parameters ?? getBusinessParameters()).holdPeriodMinutes };
};
export const getRoundTables = (id: string): RoundTable[] => tablesOf(requireRound(id));           // UC-01 step 5 (FR-05)

export function getRoundPricing(id: string) {                                                      // Booking: setPartySize() computes the fee from it
  const r = requireRound(id);
  return { roundId: id, prices: r.prices, extraPersonFee: (r.parameters ?? getBusinessParameters()).extraPersonFee };
}

export function getCheckInWindow(id: string) {                                                     // Booking: terms (UC-01 step 13), verification (UC-02)
  const r = requireRound(id);
  if (!r.checkInWindow) throw new DomainError(409, 'the round has no start time yet');
  return { roundId: id, ...r.checkInWindow };
}
