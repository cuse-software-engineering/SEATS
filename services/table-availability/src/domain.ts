// Table Availability Service — the operations of Table 5.3 (MVP), one function each. No transport code here.
// The service keeps the read model of the table map (ADR-13): the Booking Service decides who holds a table and
// reports each transition; the checks below only guard the projection against out-of-order updates.
// Every store call is asynchronous and answers a copy (ADR-06): a change to a document read here is kept only by save().
import { DomainError } from '@seats/errors/src/index.js';
import { roundTables } from './repository.js';
import type { RoundCount, RoundTableStatus, RoundTableStatusView, TableStatus, TableStatusValue } from './model.js';

export { DomainError } from '@seats/errors/src/index.js';

const view = (r: RoundTableStatus): RoundTableStatusView =>
  ({ roundId: r.roundId, version: r.version, tables: Object.values(r.tables).sort((a, b) => a.tableNumber - b.tableNumber) });

async function requireRound(roundId: string): Promise<RoundTableStatus> {
  const r = await roundTables.get(roundId);
  if (!r) throw new DomainError('not_found', `round ${roundId} has no table status`);
  return r;
}

function requireTable(round: RoundTableStatus, tableNumber: number): TableStatus {
  const t = round.tables[tableNumber];
  if (!t) throw new DomainError('not_found', `table ${tableNumber} is not in round ${round.roundId}`);
  return t;
}

/** C — called by publishRound(): every table for sale becomes AVAILABLE, the others NOT_FOR_SALE. Idempotent on retry (UC-03 EF-2). */
export async function createRoundTableStatus({ roundId, tables }: { roundId: string; tables: { tableNumber: number; forSale?: boolean }[] }): Promise<RoundTableStatusView> {
  if (!roundId || !tables?.length) throw new DomainError('invalid', 'roundId and tables are required');
  const existing = await roundTables.get(roundId);
  if (existing) return view(existing);
  const r: RoundTableStatus = { roundId, version: 1, tables: {} };
  for (const t of tables) {
    r.tables[t.tableNumber] = { tableNumber: t.tableNumber, status: t.forSale === false ? 'NOT_FOR_SALE' : 'AVAILABLE', bookingId: '', holdEndsAt: '' };
  }
  return view(await roundTables.save(r));
}

/** R — the map every open web app polls (ADR-09). */
export async function getRoundTableStatus({ roundId }: { roundId: string }): Promise<RoundTableStatusView> {
  return view(await requireRound(roundId));
}

/** R — sold-out status of the upcoming rounds (UC-01 step 3, AF-2). Unknown rounds count as 0 / 0. */
export async function countAvailableTables({ roundIds }: { roundIds: string[] }): Promise<{ counts: RoundCount[] }> {
  const ids = roundIds ?? [];
  return {
    counts: (await roundTables.getMany(ids)).map((r, i) => {
      const ts = r ? Object.values(r.tables) : [];
      return { roundId: ids[i], available: ts.filter((t) => t.status === 'AVAILABLE').length, forSale: ts.filter((t) => t.status !== 'NOT_FOR_SALE').length };
    }),
  };
}

// One conditional update of the projection. The hold itself was already won in the Booking DB (unique index on the
// active booking per table per round, ADR-13); a refused transition here means the projection is out of step.
async function transition(roundId: string, tableNumber: number, from: TableStatusValue[], to: TableStatusValue, patch: Partial<TableStatus>): Promise<TableStatus> {
  const r = await requireRound(roundId);
  const t = requireTable(r, tableNumber);
  if (!from.includes(t.status)) throw new DomainError('conflict', `table ${tableNumber} of round ${roundId} is ${t.status}, not ${from.join(' or ')}`);
  Object.assign(t, patch, { status: to });
  r.version += 1;
  await roundTables.save(r);
  return { ...t };
}

interface TableRef { roundId: string; tableNumber: number; bookingId?: string }

/** U — AVAILABLE -> HELD, reported by the Booking Service after it won the hold (BRULE-03, ADR-13). */
export async function holdTable({ roundId, tableNumber, bookingId, holdEndsAt }: TableRef & { holdEndsAt?: string }): Promise<TableStatus> {
  if (!bookingId) throw new DomainError('invalid', 'bookingId is required');
  return transition(roundId, tableNumber, ['AVAILABLE'], 'HELD', { bookingId, holdEndsAt: holdEndsAt ?? '' });
}

/** U — HELD -> AVAILABLE. Idempotent: an AVAILABLE table stays AVAILABLE, so the expiry job may retry (ADR-08). */
export async function releaseHold({ roundId, tableNumber, bookingId }: TableRef): Promise<TableStatus> {
  const t = requireTable(await requireRound(roundId), tableNumber);
  if (t.status === 'AVAILABLE') return { ...t };
  if (bookingId && t.bookingId !== bookingId) throw new DomainError('conflict', `table ${tableNumber} is held by another booking`);
  return transition(roundId, tableNumber, ['HELD'], 'AVAILABLE', { bookingId: '', holdEndsAt: '' });
}

/** U — HELD -> BOOKED when the payment is confirmed (UC-01 step 19). */
export async function markTableBooked({ roundId, tableNumber, bookingId }: TableRef): Promise<TableStatus> {
  const t = requireTable(await requireRound(roundId), tableNumber);
  if (bookingId && t.bookingId !== bookingId) throw new DomainError('conflict', `table ${tableNumber} is held by another booking`);
  return transition(roundId, tableNumber, ['HELD'], 'BOOKED', { holdEndsAt: '' });
}

/** U — BOOKED -> OCCUPIED at check-in (UC-02 step 6). */
export async function markTableOccupied({ roundId, tableNumber, bookingId }: TableRef): Promise<TableStatus> {
  const t = requireTable(await requireRound(roundId), tableNumber);
  if (bookingId && t.bookingId !== bookingId) throw new DomainError('conflict', `table ${tableNumber} belongs to another booking`);
  return transition(roundId, tableNumber, ['BOOKED'], 'OCCUPIED', {});
}

/** D — when a round is discarded. Refused while any table is held or booked. */
export async function removeRoundTableStatus({ roundId }: { roundId: string }): Promise<{ removed: boolean }> {
  const r = await roundTables.get(roundId);
  if (!r) return { removed: false };
  const busy = Object.values(r.tables).filter((t) => ['HELD', 'BOOKED', 'OCCUPIED'].includes(t.status));
  if (busy.length) throw new DomainError('conflict', `round ${roundId} still has ${busy.length} held or booked table(s)`);
  return { removed: await roundTables.remove(roundId) };
}
