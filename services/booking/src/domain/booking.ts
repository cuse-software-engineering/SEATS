// UC-01 Book a table: the hold (steps 6–8, AF-3), the party size and its fee (steps 10–11), the terms (steps 13–14),
// the start of payment (step 15), the cancellation (AF-4, AF-6) and the lists of bookings (FR-40, FR-42).
import { randomUUID } from 'node:crypto';
import { DomainError, refusalOf } from '@seats/errors/src/index.js';
import { ports } from './ports.js';
import { iso, notImplemented, requireOwnBooking, transition, view } from './shared.js';
import type { Booking, BookingView } from './model.js';

// ---------------------------------------------------------------- UC-01 hold the table
export async function createHeldBooking(customerId: string, { roundId, tableNumber }: { roundId?: string; tableNumber?: number }): Promise<BookingView> {   // UC-01 steps 6–8, AF-3
  if (!roundId || !Number.isInteger(tableNumber)) throw new DomainError('invalid', 'roundId and tableNumber are required');
  const round = await ports.concertRound.getRound(roundId).catch((e: unknown) => { throw refusalOf(e) === 'not_found' ? new DomainError('not_found', 'round not found') : e; });
  if (round.status !== 'Published' || new Date(round.bookingOpenAt) > new Date()) throw new DomainError('conflict', 'the round is not open for booking');   // FR-04, BRULE-07
  const table = round.tables.find((t) => t.tableNumber === tableNumber && t.forSale);
  if (!table) throw new DomainError('not_found', `table ${tableNumber} is not for sale in this round`);
  const id = randomUUID();
  const now = Date.now();                                                                    // one clock read: the hold ends holdPeriodMinutes after the moment it was created
  const holdEndsAt = iso(now + round.holdPeriodMinutes * 60e3);                             // BRULE-02
  // First lock wins (BRULE-03, ADR-13): the booking is the truth. The lock is an insert on the table's key: in memory
  // and in MongoDB (the unique _id index) exactly one of several concurrent inserts succeeds (NFR-20).
  if (!(await ports.tableLock.acquire(roundId, tableNumber as number, id))) throw new DomainError('conflict', 'the table has just been taken by another customer');   // AF-3
  const b: Booking = { id, customerId, roundId, tableNumber: tableNumber as number, zoneId: table.zoneId, zoneName: table.zoneName, tableTypeId: table.tableTypeId, capacity: table.capacity, status: 'Held', holdEndsAt, partySize: null, fee: null, termsAccepted: false, createdAt: iso(now), history: [{ status: 'Held', at: iso(now), by: customerId }] };
  await ports.bookings.save(b);
  try {
    await ports.tableAvailability.holdTable({ roundId, tableNumber: tableNumber as number, bookingId: id, holdEndsAt });   // the read model follows
  } catch (e) {
    await ports.bookings.remove(id);                                                           // the projection refused: the map was out of step
    await ports.tableLock.release(roundId, tableNumber as number, id);
    if (refusalOf(e) === 'conflict') throw new DomainError('conflict', 'the table has just been taken by another customer');
    throw e;
  }
  return view(b);
}

export const getBooking = async (id: string, customerId: string): Promise<BookingView> => view(await requireOwnBooking(id, customerId));   // UC-01 steps 9, 21

export async function setPartySize(id: string, customerId: string, { partySize }: { partySize?: number }): Promise<BookingView> {   // UC-01 step 10
  const b = await requireOwnBooking(id, customerId);
  if (b.status !== 'Held') throw new DomainError('conflict', `the booking is ${b.status}`);
  if (!Number.isInteger(partySize) || (partySize as number) < 1) throw new DomainError('invalid', 'partySize must be a whole number of at least 1');
  b.partySize = partySize as number;
  await computeFee(b);                                                                                 // UC-01 step 11: the fee is part of the same request
  return view(await ports.bookings.save(b));
}

/** FR-09, BRULE-08, BRULE-09: package price of the table type in its zone plus the extra-person fee. Internal step of setPartySize(). */
async function computeFee(b: Booking): Promise<void> {
  if (b.partySize === null) throw new DomainError('conflict', 'set the party size first');
  const pricing = await ports.concertRound.getRoundPricing(b.roundId);
  const price = pricing.prices.find((p) => p.zoneId === b.zoneId && p.tableTypeId === b.tableTypeId);
  if (!price) throw new DomainError('conflict', 'the round has no package price for this table');
  const extraPersons = Math.max(0, b.partySize - b.capacity);
  b.fee = { packagePrice: price.packagePrice, extraPersons, extraPersonFee: pricing.extraPersonFee, fullTableFee: price.packagePrice + extraPersons * pricing.extraPersonFee };
}

// ---------------------------------------------------------------- UC-01 terms and payment
/** A venue-local wall-clock time for the terms text, printed as the Customer Web App prints times (28 Nov 2026, 18:00). */
const fmtVenueTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

export async function getBookingTerms(id: string, customerId: string) {                             // UC-01 step 13 (FR-12, BRULE-16)
  const b = await requireOwnBooking(id, customerId);
  const w = await ports.concertRound.getCheckInWindow(b.roundId);
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
  if (b.status !== 'Held') throw new DomainError('conflict', `the booking is ${b.status}`);
  b.termsAccepted = true;
  return view(await ports.bookings.save(b));
}

export async function startPayment(id: string, customerId: string): Promise<never> {               // UC-01 step 15 — Payment Service, progress 2
  const b = await requireOwnBooking(id, customerId);
  if (b.status !== 'Held') throw new DomainError('conflict', `the booking is ${b.status}`);                 // only a held table is paid for
  if (!b.termsAccepted || b.fee === null) throw new DomainError('conflict', 'party size, fee and accepted terms are needed before paying');
  return notImplemented('startPayment()');
}

export async function cancelBooking(id: string, customerId: string): Promise<BookingView> {          // UC-01 AF-4, AF-6
  const b = await requireOwnBooking(id, customerId);
  if (b.status !== 'Held') throw new DomainError('conflict', `the booking is ${b.status}`);
  await transition(b, 'Cancelled', customerId);
  await ports.tableLock.release(b.roundId, b.tableNumber, b.id);                                   // the table is no longer occupied by this booking
  await ports.tableAvailability.releaseHold({ roundId: b.roundId, tableNumber: b.tableNumber, bookingId: b.id });   // the read model follows
  return view(b);
}

export const getCustomerBookings = async (customerId: string): Promise<BookingView[]> => (await ports.bookings.ofCustomer(customerId)).map(view);   // FR-40
export const getRoundBookings = (roundId: string): Promise<Booking[]> => ports.bookings.ofRound(roundId);                                           // FR-42 live view
