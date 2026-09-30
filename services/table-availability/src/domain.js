// Table Availability Service — the operations of Table 5.3 (MVP), one function each. No transport code here.
import { collection } from './store.js';

export const STATUS = Object.freeze({ AVAILABLE: 'AVAILABLE', HELD: 'HELD', BOOKED: 'BOOKED', OCCUPIED: 'OCCUPIED', NOT_FOR_SALE: 'NOT_FOR_SALE' });

export class DomainError extends Error {
  constructor(status, message) { super(message); this.status = status; }   // status = HTTP-like code: 400, 404, 409
}

// roundId -> { roundId, version, tables: { [tableNumber]: { tableNumber, status, bookingId, holdEndsAt } } }
const rounds = collection('roundTableStatus');

const view = (r) => ({ roundId: r.roundId, version: r.version, tables: Object.values(r.tables).sort((a, b) => a.tableNumber - b.tableNumber) });

function requireRound(roundId) {
  const r = rounds.get(roundId);
  if (!r) throw new DomainError(404, `round ${roundId} has no table status`);
  return r;
}

function requireTable(round, tableNumber) {
  const t = round.tables[tableNumber];
  if (!t) throw new DomainError(404, `table ${tableNumber} is not in round ${round.roundId}`);
  return t;
}

/** C — called by publishRound(): every table for sale becomes AVAILABLE, the others NOT_FOR_SALE. Idempotent on retry (UC-03 EF-2). */
export function initializeRoundTableStatus({ roundId, tables }) {
  if (!roundId || !tables?.length) throw new DomainError(400, 'roundId and tables are required');
  const existing = rounds.get(roundId);
  if (existing) return view(existing);
  const r = { roundId, version: 1, tables: {} };
  for (const t of tables) {
    r.tables[t.tableNumber] = { tableNumber: t.tableNumber, status: t.forSale === false ? STATUS.NOT_FOR_SALE : STATUS.AVAILABLE, bookingId: '', holdEndsAt: '' };
  }
  return view(rounds.put(roundId, r));
}

/** R — the map every open web app polls (ADR-09). */
export function getRoundTableStatus({ roundId }) {
  return view(requireRound(roundId));
}

/** R — sold-out status of the upcoming rounds (UC-01 step 3, AF-2). Unknown rounds count as 0 / 0. */
export function countAvailableTables({ roundIds }) {
  return {
    counts: (roundIds ?? []).map((id) => {
      const ts = rounds.get(id) ? Object.values(rounds.get(id).tables) : [];
      return { roundId: id, available: ts.filter((t) => t.status === STATUS.AVAILABLE).length, forSale: ts.filter((t) => t.status !== STATUS.NOT_FOR_SALE).length };
    }),
  };
}

// One conditional check-and-set. Node runs it without interleaving; with MongoDB it is one findOneAndUpdate whose
// filter carries the expected status, so exactly one of several concurrent callers succeeds (NFR-20).
function transition(roundId, tableNumber, from, to, patch) {
  const r = requireRound(roundId);
  const t = requireTable(r, tableNumber);
  if (!from.includes(t.status)) throw new DomainError(409, `table ${tableNumber} of round ${roundId} is ${t.status}, not ${from.join(' or ')}`);
  Object.assign(t, patch, { status: to });
  r.version += 1;
  rounds.put(roundId, r);
  return { ...t };
}

/** U — AVAILABLE -> HELD: first lock wins (BRULE-03, FR-08). The Booking Service owns the timer (ADR-08). */
export function holdTable({ roundId, tableNumber, bookingId, holdEndsAt }) {
  if (!bookingId) throw new DomainError(400, 'bookingId is required');
  return transition(roundId, tableNumber, [STATUS.AVAILABLE], STATUS.HELD, { bookingId, holdEndsAt: holdEndsAt ?? '' });
}

/** U — HELD -> AVAILABLE. Idempotent: an AVAILABLE table stays AVAILABLE, so the expiry job may retry (ADR-08). */
export function releaseHold({ roundId, tableNumber, bookingId }) {
  const t = requireTable(requireRound(roundId), tableNumber);
  if (t.status === STATUS.AVAILABLE) return { ...t };
  if (bookingId && t.bookingId !== bookingId) throw new DomainError(409, `table ${tableNumber} is held by another booking`);
  return transition(roundId, tableNumber, [STATUS.HELD], STATUS.AVAILABLE, { bookingId: '', holdEndsAt: '' });
}

/** U — HELD -> BOOKED when the payment is confirmed (UC-01 step 19). */
export function markTableBooked({ roundId, tableNumber, bookingId }) {
  const t = requireTable(requireRound(roundId), tableNumber);
  if (bookingId && t.bookingId !== bookingId) throw new DomainError(409, `table ${tableNumber} is held by another booking`);
  return transition(roundId, tableNumber, [STATUS.HELD], STATUS.BOOKED, { holdEndsAt: '' });
}

/** U — BOOKED -> OCCUPIED at check-in (UC-02 step 6). */
export function markTableOccupied({ roundId, tableNumber, bookingId }) {
  const t = requireTable(requireRound(roundId), tableNumber);
  if (bookingId && t.bookingId !== bookingId) throw new DomainError(409, `table ${tableNumber} belongs to another booking`);
  return transition(roundId, tableNumber, [STATUS.BOOKED], STATUS.OCCUPIED, {});
}

/** D — when a round is discarded. Refused while any table is held or booked. */
export function removeRoundTableStatus({ roundId }) {
  const r = rounds.get(roundId);
  if (!r) return { removed: false };
  const busy = Object.values(r.tables).filter((t) => [STATUS.HELD, STATUS.BOOKED, STATUS.OCCUPIED].includes(t.status));
  if (busy.length) throw new DomainError(409, `round ${roundId} still has ${busy.length} held or booked table(s)`);
  return { removed: rounds.delete(roundId) };
}
