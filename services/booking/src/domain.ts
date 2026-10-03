// Booking Service — the operations of Table 5.3 (MVP), one function each. No transport code here.
import { randomUUID } from 'node:crypto';
import { collection, DuplicateKeyError } from './store.js';
import { concertRound, tableAvailability, isGrpcError, GRPC_STATUS } from './clients.js';
import type { Booking, BookingStatus, BookingView, CustomerProfile } from './model.js';

export class DomainError extends Error {
  constructor(public readonly status: 400 | 404 | 409 | 501, message: string, public readonly details?: unknown) { super(message); }
}

const bookings = collection<Booking>('bookings');
const profiles = collection<CustomerProfile>('profiles');   // keyed by the LINE user id
/** The lock of a table in a round (ADR-13): one document per occupied table, keyed roundId/tableNumber, inserted with
 *  the hold and removed when the booking stops occupying the table. insert() is atomic on every store, so of several
 *  concurrent holds exactly one wins (BRULE-03, NFR-20). */
const holds = collection<{ bookingId: string }>('holds');
const lockKey = (roundId: string, tableNumber: number) => `${roundId}/${tableNumber}`;

const iso = (d: number | string | Date) => new Date(d).toISOString();
const notImplemented = (op: string): never => { throw new DomainError(501, `${op} is built in progress 2`); };

async function requireOwnBooking(id: string, customerId: string): Promise<Booking> {
  const b = await bookings.get(id);
  if (!b || b.customerId !== customerId) throw new DomainError(404, `booking ${id} not found`);   // FR-40: own bookings only
  return b;
}

/** One transition, appended to the booking's history (ADR-13). */
async function transition(b: Booking, status: BookingStatus, by: string): Promise<Booking> {
  b.status = status;
  b.history.push({ status, at: iso(Date.now()), by });
  return bookings.put(b.id, b);
}

/** The table is no longer occupied by this booking: its lock goes (only its own, should the table have been re-held). */
async function releaseLock(b: Booking): Promise<void> {
  const key = lockKey(b.roundId, b.tableNumber);
  if ((await holds.get(key))?.bookingId === b.id) await holds.delete(key);
}

const view = (b: Booking): BookingView =>
  ({ ...b, remainingHoldSeconds: b.status === 'Held' ? Math.max(0, Math.round((new Date(b.holdEndsAt).getTime() - Date.now()) / 1000)) : 0 });

// ---------------------------------------------------------------- UC-01 hold the table
export async function createHeldBooking(customerId: string, { roundId, tableNumber }: { roundId?: string; tableNumber?: number }): Promise<BookingView> {   // UC-01 steps 6–8, AF-3
  if (!roundId || !Number.isInteger(tableNumber)) throw new DomainError(400, 'roundId and tableNumber are required');
  const round = await concertRound.getRound(roundId).catch((e: unknown) => { throw isGrpcError(e, GRPC_STATUS.NOT_FOUND) ? new DomainError(404, 'round not found') : e; });
  if (round.status !== 'Published' || new Date(round.bookingOpenAt) > new Date()) throw new DomainError(409, 'the round is not open for booking');   // FR-04, BRULE-07
  const table = round.tables.find((t) => t.tableNumber === tableNumber && t.forSale);
  if (!table) throw new DomainError(404, `table ${tableNumber} is not for sale in this round`);
  const id = randomUUID();
  const holdEndsAt = iso(Date.now() + round.holdPeriodMinutes * 60e3);                       // BRULE-02
  // First lock wins (BRULE-03, ADR-13): the booking is the truth. The lock is an insert on the table's key: in memory
  // and in MongoDB (the unique _id index) exactly one of several concurrent inserts succeeds (NFR-20).
  const key = lockKey(roundId, tableNumber as number);
  try {
    await holds.insert(key, { bookingId: id });
  } catch (e) {
    if (e instanceof DuplicateKeyError) throw new DomainError(409, 'the table has just been taken by another customer');   // AF-3
    throw e;
  }
  const b: Booking = { id, customerId, roundId, tableNumber: tableNumber as number, zoneId: table.zoneId, zoneName: table.zoneName, tableTypeId: table.tableTypeId, capacity: table.capacity, status: 'Held', holdEndsAt, partySize: null, fee: null, termsAccepted: false, createdAt: iso(Date.now()), history: [{ status: 'Held', at: iso(Date.now()), by: customerId }] };
  await bookings.put(id, b);
  try {
    await tableAvailability.holdTable({ roundId, tableNumber: tableNumber as number, bookingId: id, holdEndsAt });   // the read model follows
  } catch (e) {
    await bookings.delete(id);                                                                 // the projection refused: the map was out of step
    await holds.delete(key);
    if (isGrpcError(e, GRPC_STATUS.FAILED_PRECONDITION)) throw new DomainError(409, 'the table has just been taken by another customer');
    throw e;
  }
  return view(b);
}

export const getBooking = async (id: string, customerId: string): Promise<BookingView> => view(await requireOwnBooking(id, customerId));   // UC-01 steps 9, 21

export async function setPartySize(id: string, customerId: string, { partySize }: { partySize?: number }): Promise<BookingView> {   // UC-01 step 10
  const b = await requireOwnBooking(id, customerId);
  if (b.status !== 'Held') throw new DomainError(409, `the booking is ${b.status}`);
  if (!Number.isInteger(partySize) || (partySize as number) < 1) throw new DomainError(400, 'partySize must be a whole number of at least 1');
  b.partySize = partySize as number;
  await computeFee(b);                                                                                 // UC-01 step 11: the fee is part of the same request
  return view(await bookings.put(id, b));
}

/** FR-09, BRULE-08, BRULE-09: package price of the table type in its zone plus the extra-person fee. Internal step of setPartySize(). */
async function computeFee(b: Booking): Promise<void> {
  if (b.partySize === null) throw new DomainError(409, 'set the party size first');
  const pricing = await concertRound.getRoundPricing(b.roundId);
  const price = pricing.prices.find((p) => p.zoneId === b.zoneId && p.tableTypeId === b.tableTypeId);
  if (!price) throw new DomainError(409, 'the round has no package price for this table');
  const extraPersons = Math.max(0, b.partySize - b.capacity);
  b.fee = { packagePrice: price.packagePrice, extraPersons, extraPersonFee: pricing.extraPersonFee, fullTableFee: price.packagePrice + extraPersons * pricing.extraPersonFee };
}

// ---------------------------------------------------------------- UC-01 customer profile (FR-10, BRULE-11)
export async function getCustomerProfile(customerId: string): Promise<CustomerProfile> {
  const p = await profiles.get(customerId);
  if (!p) throw new DomainError(404, 'no profile yet: this is the first booking');
  return p;
}

const validProfile = ({ name, phone }: { name?: string; phone?: string }): string[] => {
  const problems: string[] = [];
  if (!name?.trim()) problems.push('name is required');
  if (!/^0[689]\d{8}$/.test(phone ?? '')) problems.push('phone must be a Thai mobile number (10 digits starting with 06, 08 or 09)');   // AF-7
  return problems;
};

export async function createCustomerProfile(customerId: string, { name, phone, consent }: { name?: string; phone?: string; consent?: boolean }): Promise<CustomerProfile> {   // UC-09 steps 3–5, AF-1, AF-2
  if (await profiles.get(customerId)) throw new DomainError(409, 'the profile exists: use updateCustomerProfile()');
  if (consent !== true) throw new DomainError(400, 'the booking cannot continue without consent to the data collection');   // UC-09 AF-1; UC-01 AF-5 then cancels
  const problems = validProfile({ name, phone });
  if (problems.length) throw new DomainError(400, 'invalid profile', problems);
  return profiles.put(customerId, { customerId, name: (name as string).trim(), phone: phone as string, consentAt: iso(Date.now()) });
}

export async function updateCustomerProfile(customerId: string, { name, phone }: { name?: string; phone?: string }): Promise<CustomerProfile> {   // UC-09 steps 6–7
  const p = await getCustomerProfile(customerId);
  const next: CustomerProfile = { ...p, name: name ?? p.name, phone: phone ?? p.phone };
  const problems = validProfile(next);
  if (problems.length) throw new DomainError(400, 'invalid profile', problems);
  return profiles.put(customerId, next);
}

// ---------------------------------------------------------------- UC-01 terms and payment
/** A venue-local wall-clock time for the terms text, printed as the Customer Web App prints times (28 Nov 2026, 18:00). */
const fmtVenueTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

export async function getBookingTerms(id: string, customerId: string) {                             // UC-01 step 13 (FR-12, BRULE-16)
  const b = await requireOwnBooking(id, customerId);
  const w = await concertRound.getCheckInWindow(b.roundId);
  return {
    bookingId: id,
    terms: [
      'Full payment confirms the booking; there is no deposit and no balance to pay at the venue.',
      `Check-in opens ${fmtVenueTime(w.opensAt)} (2 hours before the show).`,
      `The table is kept until ${fmtVenueTime(w.graceEndsAt)} (30 minutes after the start).`,
      'A booking not checked in by then is a no-show and is not refunded.',
    ],
    checkInWindow: w,
  };
}

export async function acceptBookingTerms(id: string, customerId: string): Promise<BookingView> {     // UC-01 step 14
  const b = await requireOwnBooking(id, customerId);
  if (b.status !== 'Held') throw new DomainError(409, `the booking is ${b.status}`);
  b.termsAccepted = true;
  return view(await bookings.put(id, b));
}

export async function startPayment(id: string, customerId: string): Promise<never> {               // UC-01 step 15 — Payment Service, progress 2
  const b = await requireOwnBooking(id, customerId);
  if (!b.termsAccepted || b.fee === null) throw new DomainError(409, 'party size, fee and accepted terms are needed before paying');
  return notImplemented('startPayment()');
}

export async function cancelBooking(id: string, customerId: string): Promise<BookingView> {          // UC-01 AF-4, AF-6
  const b = await requireOwnBooking(id, customerId);
  if (b.status !== 'Held') throw new DomainError(409, `the booking is ${b.status}`);
  await transition(b, 'Cancelled', customerId);
  await releaseLock(b);
  await tableAvailability.releaseHold({ roundId: b.roundId, tableNumber: b.tableNumber, bookingId: b.id });   // the read model follows
  return view(b);
}

export const getCustomerBookings = async (customerId: string): Promise<BookingView[]> => (await bookings.find({ customerId })).map(view);   // FR-40
export const getRoundBookings = (roundId: string): Promise<Booking[]> => bookings.find({ roundId });                                         // FR-42 live view

// ---------------------------------------------------------------- Time: hold expiry (UC-01 EF-1, FR-23, ADR-08). A job on the service's own timer, not an operation.
export async function expireUnpaidBookings(now = Date.now()): Promise<string[]> {
  const expired: string[] = [];
  for (const b of (await bookings.find({ status: 'Held' })).filter((b) => new Date(b.holdEndsAt).getTime() <= now)) {
    await transition(b, 'Expired', 'hold-expiry job');
    await releaseLock(b);
    await tableAvailability.releaseHold({ roundId: b.roundId, tableNumber: b.tableNumber, bookingId: b.id })
      .catch((e: Error) => console.warn(`[booking] releaseHold retry later: ${e.message}`));
    console.log(`[booking] hold expired for booking ${b.id}; Notification Service sendHoldExpiredNotice() comes in progress 2`);
    expired.push(b.id);
  }
  return expired;
}

// ---------------------------------------------------------------- progress 2 (the e-ticket is issued inside confirmBookingPayment())
export const getETicket = (): never => notImplemented('getETicket()');
export const verifyBookingReference = (): never => notImplemented('verifyBookingReference()');
export const checkInBooking = (): never => notImplemented('checkInBooking()');
