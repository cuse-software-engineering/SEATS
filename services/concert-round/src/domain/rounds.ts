// UC-03 Create Concert Round: a round is created as a Draft, edited (steps 3–10; AF-1 any field while Draft, AF-3 only
// what BRULE-07 allows once booking is open), validated (S-1, FR-75) and published (steps 14–15) with its table status
// handed to the Table Availability Service; then the reads of the customer (UC-01) and of the Booking Service.
import { randomUUID } from 'node:crypto';
import { DomainError } from '@seats/errors/src/index.js';
import { ports } from './ports.js';
import { getBusinessParameters } from './business-parameters.js';
import { applyPatch, deriveCheckInWindow, iso, now, requireRound, ROUND_FIELDS, tableTypesById, type RoundField, type RoundPatch } from './shared.js';
import type { PackagePrice, Round, RoundTable, UpcomingRound, ValidationResult } from './model.js';
export type { RoundPatch } from './shared.js';

export async function createRound({ name }: { name?: string } = {}): Promise<Round> {               // UC-03 steps 1–2
  const r: Round = { id: randomUUID(), name: name ?? 'Untitled round', artist: '', status: 'Draft', date: '', doorsOpenAt: '', startAt: '', bookingOpenAt: '', zoneMapId: '', tablesNotForSale: [], prices: [], checkInWindow: null, parameters: null, createdAt: iso(now()) };
  return ports.rounds.save(r);
}

/** UC-03 steps 3–10, AF-1 (Draft: any field) and AF-3 (Published: only what BRULE-07 allows after the booking-open time). */
export async function updateRound(id: string, patch: RoundPatch): Promise<Round & { confirmedBookings?: number }> {
  const r = await requireRound(id);
  if (r.status === 'Draft') {
    applyPatch(r, patch, ROUND_FIELDS);
    r.checkInWindow = deriveCheckInWindow(r.startAt, await getBusinessParameters());
    return ports.rounds.save(r);
  }
  const bookingOpen = !!r.bookingOpenAt && new Date(r.bookingOpenAt) <= now();
  const status = await ports.tableAvailability.getRoundTableStatus(id);
  const booked = status.tables.filter((t) => ['BOOKED', 'OCCUPIED'].includes(t.status)).length;
  const allowed: readonly RoundField[] = !bookingOpen ? ROUND_FIELDS : booked === 0 ? ['name', 'artist', 'date', 'doorsOpenAt', 'startAt'] : ['name', 'artist'];
  const refused = (Object.keys(patch) as RoundField[]).filter((k) => ROUND_FIELDS.includes(k) && !allowed.includes(k));
  if (refused.length) throw new DomainError('conflict', `after the booking-open time these fields are fixed: ${refused.join(', ')}`, { confirmedBookings: booked });
  const before = { zoneMapId: r.zoneMapId, tablesNotForSale: [...r.tablesNotForSale] };
  applyPatch(r, patch, allowed);
  r.checkInWindow = deriveCheckInWindow(r.startAt, r.parameters ?? (await getBusinessParameters()));
  if (r.zoneMapId !== before.zoneMapId || r.tablesNotForSale.join() !== before.tablesNotForSale.join()) {   // AF-3 step 2, before booking opens: the table map follows
    await ports.tableAvailability.removeRoundTableStatus(id);
    await ports.tableAvailability.createRoundTableStatus({ roundId: id, tables: (await tablesOf(r)).map((t) => ({ tableNumber: t.tableNumber, forSale: t.forSale })) });
  }
  return { ...(await ports.rounds.save(r)), confirmedBookings: booked };
}

async function tablesOf(r: Round): Promise<RoundTable[]> {                                        // tables of the round with zone, type, price
  const map = await ports.zoneMaps.get(r.zoneMapId);
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
  const map = await ports.zoneMaps.get(r.zoneMapId);
  if (!map) problems.push('the round has no zone map');
  else if (map.status !== 'Active') problems.push('the zone map is not Active');
  for (const tb of (await tablesOf(r)).filter((x) => x.forSale)) {
    if (tb.packagePrice === null) problems.push(`no package price for ${tb.tableTypeName || tb.tableTypeId} in ${tb.zoneName || tb.zoneId}`);
  }
  if (r.startAt && r.doorsOpenAt) {
    const mine = [t(r.doorsOpenAt), r.checkInWindow ? t(r.checkInWindow.graceEndsAt) : t(r.startAt)];
    for (const o of (await ports.rounds.published()).filter((o) => o.id !== id && o.startAt)) {
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
  if (!v.valid) throw new DomainError('invalid', 'the round is not valid', v.problems);
  r.parameters = { ...(await getBusinessParameters()) };                                         // the values in force for this round (FR-38)
  r.checkInWindow = deriveCheckInWindow(r.startAt, r.parameters);
  await ports.tableAvailability.createRoundTableStatus({ roundId: id, tables: (await tablesOf(r)).map((t) => ({ tableNumber: t.tableNumber, forSale: t.forSale })) });
  r.status = 'Published';
  return ports.rounds.save(r);
}

export async function discardDraftRound(id: string): Promise<{ removed: boolean }> {               // D of CRUD
  const r = await requireRound(id);
  if (r.status !== 'Draft') throw new DomainError('conflict', 'only a Draft round can be discarded');
  await ports.rounds.remove(id);
  return { removed: true };
}

export async function getUpcomingRounds(): Promise<UpcomingRound[]> {                              // UC-01 step 3 (FR-03), AF-1, AF-2
  const today = iso(now()).slice(0, 10);
  const list = (await ports.rounds.published()).filter((r) => r.date >= today).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const counts = list.length ? (await ports.tableAvailability.countAvailableTables(list.map((r) => r.id))).counts : [];
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
  if (!r.checkInWindow) throw new DomainError('conflict', 'the round has no start time yet');
  return { roundId: id, ...r.checkInWindow };
}
