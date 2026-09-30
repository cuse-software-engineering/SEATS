// Booking Service — the operations of Table 5.3 (MVP), one function each. No transport code here.
import { randomUUID } from 'node:crypto';
import { collection } from './store.js';
import { concertRound, tableAvailability, GRPC_STATUS } from './clients.js';

export class DomainError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}

const bookings = collection('bookings');    // { id, customerId, roundId, tableNumber, zoneName, tableTypeId, capacity, status, holdEndsAt, partySize, fee, termsAccepted, createdAt }
const profiles = collection('profiles');    // customerId (LINE user id) -> { customerId, name, phone, consentAt }

const iso = (d) => new Date(d).toISOString();
const notImplemented = (op) => { throw new DomainError(501, `${op} is built in progress 2`); };

function requireOwnBooking(id, customerId) {
  const b = bookings.get(id);
  if (!b || (customerId && b.customerId !== customerId)) throw new DomainError(404, `booking ${id} not found`);   // FR-40: own bookings only
  return b;
}

// ---------------------------------------------------------------- UC-01 hold the table
export async function createHeldBooking(customerId, { roundId, tableNumber }) {          // UC-01 steps 6–8, AF-3
  if (!roundId || !Number.isInteger(tableNumber)) throw new DomainError(400, 'roundId and tableNumber are required');
  const round = await concertRound.getRound(roundId).catch((e) => { throw e.code === GRPC_STATUS.NOT_FOUND ? new DomainError(404, 'round not found') : e; });
  if (round.status !== 'Published' || new Date(round.bookingOpenAt) > new Date()) throw new DomainError(409, 'the round is not open for booking');   // FR-04, BRULE-07
  const table = round.tables.find((t) => t.tableNumber === tableNumber && t.forSale);
  if (!table) throw new DomainError(404, `table ${tableNumber} is not for sale in this round`);
  const id = randomUUID();
  const holdEndsAt = iso(Date.now() + round.holdPeriodMinutes * 60e3);                   // BRULE-02
  try {
    await tableAvailability.holdTable({ roundId, tableNumber, bookingId: id, holdEndsAt });
  } catch (e) {
    if (e.code === GRPC_STATUS.FAILED_PRECONDITION) throw new DomainError(409, 'the table has just been taken by another customer');   // AF-3, first lock wins
    throw e;
  }
  const b = { id, customerId, roundId, tableNumber, zoneName: table.zoneName, tableTypeId: table.tableTypeId, capacity: table.capacity, status: 'Held', holdEndsAt, partySize: null, fee: null, termsAccepted: false, createdAt: iso(Date.now()) };
  return bookings.put(id, b);
}

export function getBooking(id, customerId) {                                             // UC-01 steps 9, 21
  const b = requireOwnBooking(id, customerId);
  return { ...b, remainingHoldSeconds: b.status === 'Held' ? Math.max(0, Math.round((new Date(b.holdEndsAt) - Date.now()) / 1000)) : 0 };
}

export async function setPartySize(id, customerId, { partySize }) {                      // UC-01 step 10
  const b = requireOwnBooking(id, customerId);
  if (b.status !== 'Held') throw new DomainError(409, `the booking is ${b.status}`);
  if (!Number.isInteger(partySize) || partySize < 1) throw new DomainError(400, 'partySize must be a whole number of at least 1');
  b.partySize = partySize;
  bookings.put(id, b);
  return calculateTableFee(id, customerId);
}

export async function calculateTableFee(id, customerId) {                                // UC-01 step 11 (FR-09, BRULE-08, BRULE-09)
  const b = requireOwnBooking(id, customerId);
  if (b.partySize === null) throw new DomainError(409, 'set the party size first');
  const pricing = await concertRound.getRoundPricing(b.roundId);
  const price = pricing.prices.find((p) => p.tableTypeId === b.tableTypeId && (p.zoneId === b.zoneId || p.zoneName === undefined));
  const packagePrice = (pricing.prices.find((p) => p.tableTypeId === b.tableTypeId && p.zoneId === b.zoneId) ?? price)?.packagePrice;
  if (packagePrice === undefined) throw new DomainError(409, 'the round has no package price for this table');
  const extraPersons = Math.max(0, b.partySize - b.capacity);
  b.fee = { packagePrice, extraPersons, extraPersonFee: pricing.extraPersonFee, fullTableFee: packagePrice + extraPersons * pricing.extraPersonFee };
  bookings.put(id, b);
  return getBooking(id, customerId);
}

// ---------------------------------------------------------------- UC-01 customer profile (FR-10, BRULE-11)
export const getCustomerProfile = (customerId) => profiles.get(customerId) ?? (() => { throw new DomainError(404, 'no profile yet: this is the first booking'); })();

const validProfile = ({ name, phone }) => {
  const problems = [];
  if (!name?.trim()) problems.push('name is required');
  if (!/^0[689]\d{8}$/.test(phone ?? '')) problems.push('phone must be a Thai mobile number (10 digits starting with 06, 08 or 09)');   // AF-7
  return problems;
};

export function createCustomerProfile(customerId, { name, phone, consent }) {            // UC-01 step 12a, AF-6, AF-7
  if (profiles.get(customerId)) throw new DomainError(409, 'the profile exists: use updateCustomerProfile()');
  if (consent !== true) throw new DomainError(400, 'the booking cannot continue without consent to the data collection');   // AF-6 is then cancelBooking()
  const problems = validProfile({ name, phone });
  if (problems.length) throw new DomainError(400, 'invalid profile', problems);
  return profiles.put(customerId, { customerId, name: name.trim(), phone, consentAt: iso(Date.now()) });
}

export function updateCustomerProfile(customerId, { name, phone }) {                     // UC-01 step 12b
  const p = getCustomerProfile(customerId);
  const next = { ...p, name: name ?? p.name, phone: phone ?? p.phone };
  const problems = validProfile(next);
  if (problems.length) throw new DomainError(400, 'invalid profile', problems);
  return profiles.put(customerId, next);
}

// ---------------------------------------------------------------- UC-01 terms and payment
export async function getBookingTerms(id, customerId) {                                  // UC-01 step 13 (FR-12, BRULE-16)
  const b = requireOwnBooking(id, customerId);
  const w = await concertRound.getCheckInWindow(b.roundId);
  return {
    bookingId: id,
    terms: [
      'Full payment confirms the booking; there is no deposit and no balance to pay at the venue.',
      `Check-in opens at ${w.opensAt} (2 hours before the show).`,
      `The table is kept until ${w.graceEndsAt} (30 minutes after the start).`,
      'A booking not checked in by then is a no-show and is not refunded.',
    ],
    checkInWindow: w,
  };
}

export function acceptBookingTerms(id, customerId) {                                     // UC-01 step 14
  const b = requireOwnBooking(id, customerId);
  if (b.status !== 'Held') throw new DomainError(409, `the booking is ${b.status}`);
  b.termsAccepted = true;
  return bookings.put(id, b);
}

export function startPayment(id, customerId) {                                           // UC-01 step 15 — Payment Service, progress 2
  const b = requireOwnBooking(id, customerId);
  if (!b.termsAccepted || b.fee === null) throw new DomainError(409, 'party size, fee and accepted terms are needed before paying');
  notImplemented('startPayment()');
}

export async function cancelBooking(id, customerId) {                                    // UC-01 AF-4, AF-6
  const b = requireOwnBooking(id, customerId);
  if (b.status !== 'Held') throw new DomainError(409, `the booking is ${b.status}`);
  await tableAvailability.releaseHold({ roundId: b.roundId, tableNumber: b.tableNumber, bookingId: b.id });
  b.status = 'Cancelled';
  return bookings.put(id, b);
}

export const getCustomerBookings = (customerId) => bookings.list().filter((b) => b.customerId === customerId).map((b) => getBooking(b.id, customerId));   // FR-40
export const getRoundBookings = (roundId) => bookings.list().filter((b) => b.roundId === roundId);                                                        // FR-42 live view

// ---------------------------------------------------------------- Time: hold expiry (UC-01 EF-1, FR-23, ADR-08)
export async function expireUnpaidBookings(now = Date.now()) {
  const expired = [];
  for (const b of bookings.list().filter((b) => b.status === 'Held' && new Date(b.holdEndsAt).getTime() <= now)) {
    b.status = 'Expired';
    bookings.put(b.id, b);
    await tableAvailability.releaseHold({ roundId: b.roundId, tableNumber: b.tableNumber, bookingId: b.id }).catch((e) => console.warn(`[booking] releaseHold retry later: ${e.message}`));
    console.log(`[booking] hold expired for booking ${b.id}; Notification Service sendHoldExpiredNotice() comes in progress 2`);
    expired.push(b.id);
  }
  return expired;
}

// ---------------------------------------------------------------- progress 2
export const issueETicket = () => notImplemented('issueETicket()');
export const getETicket = () => notImplemented('getETicket()');
export const verifyBookingReference = () => notImplemented('verifyBookingReference()');
export const checkInBooking = () => notImplemented('checkInBooking()');
