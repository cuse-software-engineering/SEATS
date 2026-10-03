// UC-04 Create Venue Zone Map: a map is created as a Draft, gets the image of the venue (step 3, through the Media
// Storage Adapter, FR-39), its zones and tables (steps 4–7), is validated (S-1, FR-74) and activated (steps 11–12);
// an Active map keeps every table a published round has booked (AF-1). A Draft can be discarded.
import { randomUUID } from 'node:crypto';
import { DomainError, InfrastructureError, refusalOf } from '@seats/errors/src/index.js';
import { ports } from './ports.js';
import { iso, now, requireZoneMap, tableTypesById, zoneSummary, type ZoneMapView } from './shared.js';
import type { ValidationResult, Zone, ZoneMap, ZoneMapStatus, ZoneMapTable } from './model.js';
export type { ZoneMapView, ZoneSummary } from './shared.js';

export async function createZoneMap({ name }: { name?: string } = {}): Promise<ZoneMap> {           // UC-04 steps 1–2
  const map: ZoneMap = { id: randomUUID(), name: name ?? 'Untitled zone map', status: 'Draft', imageUrl: '', zones: [], tables: [], createdAt: iso(now()) };
  return ports.zoneMaps.save(map);
}

export async function uploadZoneMapImage(id: string, { fileName }: { fileName?: string }): Promise<ZoneMap> {   // UC-04 step 3, EF-3
  const map = await requireZoneMap(id);
  if (!fileName) throw new DomainError('invalid', 'fileName is required');
  let url: string;
  try {
    ({ url } = await ports.mediaStorage.store(id, fileName));                                   // the Media Storage Adapter (FR-39)
  } catch (e) {                                                                                    // EF-3: the map keeps its old image
    throw new InfrastructureError('the object storage', 'the image of the venue could not be stored; the zone map is unchanged', { cause: e });
  }
  map.imageUrl = url;
  return ports.zoneMaps.save(map);
}

async function bookedTablesOfMap(mapId: string): Promise<Set<number>> {
  const numbers = new Set<number>();
  for (const r of await ports.rounds.publishedOnMap(mapId)) {
    // a round without a table map yet has no bookings; a collaborator that does not answer is not swallowed (AF-1 step 3 must be checked)
    const status = await ports.tableAvailability.getRoundTableStatus(r.id).catch((e: unknown) => { if (refusalOf(e) === 'not_found') return { tables: [] }; throw e; });
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
        throw new DomainError('conflict', `table ${n} has Confirmed bookings and cannot be removed or moved`, { bookedTables: [...booked] });
      }
    }
  }
  if (name !== undefined) map.name = name;
  if (zones !== undefined) map.zones = zones.map((z) => ({ id: z.id ?? randomUUID(), name: z.name ?? '' }));
  if (tables !== undefined) map.tables = tables.map((t) => ({ tableNumber: t.tableNumber ?? 0, zoneId: t.zoneId ?? '', tableTypeId: t.tableTypeId ?? '', capacity: t.capacity ?? 0, x: t.x ?? 0, y: t.y ?? 0 }));
  await ports.zoneMaps.save(map);
  return getZoneMap(id);                                                                          // UC-04 step 7: tables and capacity per zone
}

export const listZoneMaps = async ({ status }: { status?: string } = {}) =>
  (await (status ? ports.zoneMaps.withStatus(status as ZoneMapStatus) : ports.zoneMaps.all())).map((m) => ({ id: m.id, name: m.name, status: m.status, tables: m.tables.length }));
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
  if (!v.valid) throw new DomainError('invalid', 'the zone map is not valid', v.problems);
  map.status = 'Active';
  return ports.zoneMaps.save(map);
}

export async function discardDraftZoneMap(id: string): Promise<{ removed: boolean }> {             // D of CRUD
  const map = await requireZoneMap(id);
  if (map.status !== 'Draft') throw new DomainError('conflict', 'only a Draft zone map can be discarded');
  await ports.zoneMaps.remove(id);
  return { removed: true };
}
