// The helpers the use-case modules of the domain share: the lookups that refuse with not_found, the time helpers, the
// per-zone summary of a map, the check-in window of a round (BRULE-04, BRULE-05) and the patch of a round's fields.
// Internal to the folder: index.ts re-exports its types through the use-case modules, never the helpers.
import { DomainError } from '@seats/errors/src/index.js';
import { ports } from './ports.js';
import type { BusinessParameters, CheckInWindow, Round, TableType, ZoneMap } from './model.js';

export const now = () => new Date();
export const iso = (d: string | number | Date) => new Date(d).toISOString();

export async function requireZoneMap(id: string): Promise<ZoneMap> {
  const m = await ports.zoneMaps.get(id);
  if (!m) throw new DomainError('not_found', `zone map ${id} not found`);
  return m;
}
export async function requireRound(id: string): Promise<Round> {
  const r = await ports.rounds.get(id);
  if (!r) throw new DomainError('not_found', `round ${id} not found`);
  return r;
}
export const tableTypesById = async (): Promise<Map<string, TableType>> => new Map((await ports.tableTypes.all()).map((t) => [t.id, t]));   // one read for a whole map

export interface ZoneSummary { zoneId: string; name: string; tables: number; capacity: number }
export type ZoneMapView = ZoneMap & { summary: ZoneSummary[] };

export const zoneSummary = (map: ZoneMap): ZoneSummary[] => map.zones.map((z) => {
  const ts = map.tables.filter((t) => t.zoneId === z.id);
  return { zoneId: z.id, name: z.name, tables: ts.length, capacity: ts.reduce((s, t) => s + (t.capacity ?? 0), 0) };
});

export function deriveCheckInWindow(startAt: string, p: BusinessParameters): CheckInWindow | null {       // UC-03 step 5 (BRULE-04, BRULE-05)
  if (!startAt) return null;
  const s = new Date(startAt).getTime();
  return { opensAt: iso(s - p.checkInWindowHours * 3600e3), startAt: iso(s), graceEndsAt: iso(s + p.gracePeriodMinutes * 60e3) };
}

export type RoundPatch = Partial<Pick<Round, 'name' | 'artist' | 'date' | 'doorsOpenAt' | 'startAt' | 'bookingOpenAt' | 'zoneMapId' | 'tablesNotForSale' | 'prices'>>;
export const ROUND_FIELDS = ['name', 'artist', 'date', 'doorsOpenAt', 'startAt', 'bookingOpenAt', 'zoneMapId', 'tablesNotForSale', 'prices'] as const;
export type RoundField = (typeof ROUND_FIELDS)[number];

export function applyPatch(r: Round, patch: RoundPatch, fields: readonly RoundField[]) {
  for (const f of fields) {
    const v = patch[f];
    if (v !== undefined) (r as unknown as Record<RoundField, unknown>)[f] = v;
  }
}
