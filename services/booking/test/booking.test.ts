// Unit tests of domain/booking.ts (UC-01 Book a table, ADR-13): the hold, the party size and its fee, the terms, the
// start of payment, the cancellation and the lists. The Concert Round and Table Availability clients are the stubs of
// test/fixtures.ts. Three designs on top of the first tests: a decision table for createHeldBooking(), equivalence
// classes with boundary values for setPartySize(), and the state × operation matrix of a booking.
import { beforeEach, describe, test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain/index.js';
import { concertRound, tableAvailability, GRPC_STATUS } from '../src/infrastructure/clients.js';
import { resetStore, wire } from '../src/infrastructure/index.js';
import { calls, expire, grpcError, iso, MALEE, MINUTE, rejected, round, SOMCHAI, stubCollaborators } from './fixtures.js';

wire();   // binds the in-memory repositories and the client objects to the domain's ports

beforeEach(async () => { await resetStore(); stubCollaborators(); });

const hold = (customerId = SOMCHAI, tableNumber = 1, roundId = 'r1') => d.createHeldBooking(customerId, { roundId, tableNumber });
const NOW = Date.parse('2026-10-03T12:00:00.000Z');                                                   // the frozen clock of the exact boundaries
const freeze = (t: TestContext, now = NOW) => t.mock.timers.enable({ apis: ['Date'], now });          // restored when the test ends

describe('createHeldBooking', () => {
  test('creates a Held booking with the table copied from the round and reports the hold to the read model', async () => {
    const b = await d.createHeldBooking(SOMCHAI, { roundId: 'r1', tableNumber: 1 });
    assert.equal(b.status, 'Held');
    assert.ok(b.remainingHoldSeconds > 0 && b.remainingHoldSeconds <= 15 * 60);
    assert.deepEqual(b.history.map((h) => [h.status, h.by]), [['Held', SOMCHAI]]);
    assert.deepEqual([b.zoneId, b.zoneName, b.tableTypeId, b.capacity, b.partySize, b.fee, b.termsAccepted], ['A', 'Zone A', 'sofa6', 6, null, null, false]);
    assert.deepEqual(calls.holds, [{ roundId: 'r1', tableNumber: 1, bookingId: b.id, holdEndsAt: b.holdEndsAt }]);
    assert.equal((await d.getBooking(b.id, SOMCHAI)).id, b.id);
  });
  test('a second hold on the same table by another customer is refused: the first lock wins', async () => {
    await d.createHeldBooking(SOMCHAI, { roundId: 'r1', tableNumber: 1 });
    await rejected(d.createHeldBooking(MALEE, { roundId: 'r1', tableNumber: 1 }), 'conflict');
    assert.equal(calls.holds.length, 1);
    assert.equal((await d.getCustomerBookings(MALEE)).length, 0);
    await d.createHeldBooking(MALEE, { roundId: 'r1', tableNumber: 2 });                      // another table is fine
    assert.equal(calls.holds.length, 2);
  });
  test('a round that is not open is refused', async () => {
    concertRound.getRound = async () => round({ bookingOpenAt: new Date(Date.now() + 3600e3).toISOString() });
    await rejected(d.createHeldBooking(SOMCHAI, { roundId: 'r1', tableNumber: 1 }), 'conflict');
    concertRound.getRound = async () => round({ status: 'Draft' });
    await rejected(d.createHeldBooking(SOMCHAI, { roundId: 'r1', tableNumber: 1 }), 'conflict');
    assert.equal(calls.holds.length, 0);
  });
  test('an unknown round, a table not for sale and a bad request', async () => {
    await rejected(d.createHeldBooking(SOMCHAI, { roundId: 'r1', tableNumber: 3 }), 'not_found');
    await rejected(d.createHeldBooking(SOMCHAI, { roundId: 'r1', tableNumber: 42 }), 'not_found');
    await rejected(d.createHeldBooking(SOMCHAI, { roundId: 'r1' }), 'invalid');
    concertRound.getRound = async () => { throw Object.assign(new Error('not found'), { code: GRPC_STATUS.NOT_FOUND }); };
    await rejected(d.createHeldBooking(SOMCHAI, { roundId: 'nope', tableNumber: 1 }), 'not_found');
  });
  test('when the read model refuses the hold the booking is dropped', async () => {
    tableAvailability.holdTable = async () => { throw Object.assign(new Error('HELD'), { code: GRPC_STATUS.FAILED_PRECONDITION }); };
    await rejected(d.createHeldBooking(SOMCHAI, { roundId: 'r1', tableNumber: 1 }), 'conflict');
    assert.deepEqual(await d.getCustomerBookings(SOMCHAI), []);
  });
});

describe('createHeldBooking: decision table (FR-04, BRULE-03, BRULE-07)', () => {
  // Conditions, in the order the operation checks them:
  //   C1 request complete (roundId, integer tableNumber)   C2 round known to the Concert Round Service   C3 round Published
  //   C4 bookingOpenAt <= now   C5 table in the round   C6 table for sale   C7 table free (the lock, BRULE-03)   C8 read model accepts the hold
  //  rule | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | outcome
  //  R1   | N  | -  | -  | -  | -  | -  | -  | -  | invalid; the round is not even asked for
  //  R2   | Y  | N  | -  | -  | -  | -  | -  | -  | not_found 'round not found'
  //  R3   | Y  | Y  | N  | Y  | -  | -  | -  | -  | conflict 'not open' (Draft)
  //  R4   | Y  | Y  | Y  | N  | -  | -  | -  | -  | conflict 'not open' (opens later)
  //  R5   | Y  | Y  | N  | N  | -  | -  | -  | -  | conflict 'not open' (both)
  //  R6   | Y  | Y  | Y  | Y  | N  | -  | -  | -  | not_found 'not for sale' (no such table)
  //  R7   | Y  | Y  | Y  | Y  | Y  | N  | -  | -  | not_found 'not for sale'
  //  R8   | Y  | Y  | Y  | Y  | Y  | Y  | N  | -  | conflict 'just taken' (first lock wins, whoever holds it)
  //  R9   | Y  | Y  | Y  | Y  | Y  | Y  | Y  | N  | conflict 'just taken'; the booking is dropped and the lock released
  //  R10  | Y  | Y  | Y  | Y  | Y  | Y  | Y  | Y  | Held; the hold is reported to the read model
  //  C4 boundary (the rule is bookingOpenAt > now -> not open): before now / exactly now / one ms after now -> open / open / not open.
  //  A collaborator that does not answer (InfrastructureError) is not a rule: it passes through untranslated.
  type Row = { rule: string; req?: { roundId?: string; tableNumber?: number }; arrange?: (t: TestContext) => void | Promise<void>; expect: 'Held' | [d.DomainError['kind'], RegExp]; holds?: number };
  const notAsked = () => { concertRound.getRound = async () => { throw new Error('the round must not be asked for'); }; };
  const roundIs = (over: Parameters<typeof round>[0]) => () => { concertRound.getRound = async () => round(over); };
  const rows: Row[] = [
    { rule: 'R1 request without roundId: {tableNumber: 1} -> invalid, the round not asked for', req: { tableNumber: 1 }, arrange: notAsked, expect: ['invalid', /required/] },
    { rule: 'R1 request with an empty roundId: "" -> invalid', req: { roundId: '', tableNumber: 1 }, arrange: notAsked, expect: ['invalid', /required/] },
    { rule: 'R1 request without tableNumber: {roundId: r1} -> invalid', req: { roundId: 'r1' }, arrange: notAsked, expect: ['invalid', /required/] },
    { rule: 'R1 request with a fractional tableNumber: 1.5 -> invalid', req: { roundId: 'r1', tableNumber: 1.5 }, arrange: notAsked, expect: ['invalid', /required/] },
    { rule: 'R1 request with tableNumber NaN -> invalid', req: { roundId: 'r1', tableNumber: NaN }, arrange: notAsked, expect: ['invalid', /required/] },
    { rule: 'R2 round unknown (the Concert Round Service answers NOT_FOUND) -> not_found "round not found"', arrange: () => { concertRound.getRound = async () => { throw grpcError(GRPC_STATUS.NOT_FOUND); }; }, expect: ['not_found', /round not found/] },
    { rule: 'R3 round Draft, bookingOpenAt in the past -> conflict "not open"', arrange: roundIs({ status: 'Draft' }), expect: ['conflict', /not open/] },
    { rule: 'R4 round Published, bookingOpenAt in one hour -> conflict "not open"', arrange: roundIs({ bookingOpenAt: iso(Date.now() + 60 * MINUTE) }), expect: ['conflict', /not open/] },
    { rule: 'R4 boundary: bookingOpenAt one ms after now -> conflict "not open"', arrange: (t) => { freeze(t); roundIs({ bookingOpenAt: iso(NOW + 1) })(); }, expect: ['conflict', /not open/] },
    { rule: 'R5 round Draft and bookingOpenAt in one hour -> conflict "not open"', arrange: roundIs({ status: 'Draft', bookingOpenAt: iso(Date.now() + 60 * MINUTE) }), expect: ['conflict', /not open/] },
    { rule: 'R6 table 42 not in the round -> not_found "not for sale"', req: { roundId: 'r1', tableNumber: 42 }, expect: ['not_found', /not for sale/] },
    { rule: 'R6 round without tables -> not_found "not for sale"', arrange: roundIs({ tables: [] }), expect: ['not_found', /not for sale/] },
    { rule: 'R7 table 3 in the round but not for sale -> not_found "not for sale"', req: { roundId: 'r1', tableNumber: 3 }, expect: ['not_found', /not for sale/] },
    { rule: 'R8 table 1 already held by another customer -> conflict "just taken"', arrange: async () => { await hold(MALEE); }, expect: ['conflict', /just been taken/], holds: 1 },
    { rule: 'R8 table 1 already held by the same customer -> conflict "just taken" (one hold per table, whoever asks)', arrange: async () => { await hold(SOMCHAI); }, expect: ['conflict', /just been taken/], holds: 1 },
    { rule: 'R9 read model refuses the hold (FAILED_PRECONDITION) -> conflict "just taken"', arrange: () => { tableAvailability.holdTable = async () => { throw grpcError(GRPC_STATUS.FAILED_PRECONDITION, 'HELD'); }; }, expect: ['conflict', /just been taken/] },
    { rule: 'R10 Published, open since the past, table 1 for sale and free -> Held', expect: 'Held', holds: 1 },
    { rule: 'R10 boundary: bookingOpenAt exactly now -> Held (the round opens at that instant)', arrange: (t) => { freeze(t); roundIs({ bookingOpenAt: iso(NOW) })(); }, expect: 'Held', holds: 1 },
    { rule: 'R10 boundary: bookingOpenAt one ms before now -> Held', arrange: (t) => { freeze(t); roundIs({ bookingOpenAt: iso(NOW - 1) })(); }, expect: 'Held', holds: 1 },
    { rule: 'R10 table 2 (the other table type) -> Held', req: { roundId: 'r1', tableNumber: 2 }, expect: 'Held', holds: 1 },
    { rule: 'R10 table 1 of another round r2 -> Held (the lock is per round and table)', req: { roundId: 'r2', tableNumber: 1 }, expect: 'Held', holds: 1 },
  ];
  for (const r of rows) test(r.rule, async (t) => {
    await r.arrange?.(t);
    const before = (await d.getCustomerBookings(SOMCHAI)).length;
    const p = d.createHeldBooking(SOMCHAI, r.req ?? { roundId: 'r1', tableNumber: 1 });
    if (r.expect === 'Held') assert.equal((await p).status, 'Held'); else await rejected(p, ...r.expect);
    assert.equal(calls.holds.length, r.holds ?? 0, 'holds reported to the read model');
    assert.equal((await d.getCustomerBookings(SOMCHAI)).length, before + (r.expect === 'Held' ? 1 : 0), 'a refused hold leaves no booking');
  });
  test('R9: the read model refuses -> the lock is released and no booking remains, so the next hold on the table succeeds', async () => {
    tableAvailability.holdTable = async () => { throw grpcError(GRPC_STATUS.FAILED_PRECONDITION, 'HELD'); };
    await rejected(hold(), 'conflict', /just been taken/);
    assert.deepEqual([await d.getCustomerBookings(SOMCHAI), await d.getRoundBookings('r1')], [[], []]);
    stubCollaborators();
    assert.equal((await hold(MALEE)).status, 'Held');                                                  // the lock was released with the booking
  });
  test('R9 variant: the read model does not answer (a transport failure) -> the failure passes through, the booking and the lock are dropped', async () => {
    tableAvailability.holdTable = async () => { throw new d.InfrastructureError('the Table Availability Service', 'did not answer'); };
    await assert.rejects(hold(), d.InfrastructureError);
    assert.deepEqual(await d.getRoundBookings('r1'), []);
    stubCollaborators();
    assert.equal((await hold(MALEE)).status, 'Held');
  });
  test('R2 variant: the Concert Round Service does not answer -> the failure passes through, nothing is held', async () => {
    concertRound.getRound = async () => { throw new d.InfrastructureError('the Concert Round Service', 'did not answer'); };
    await assert.rejects(hold(), d.InfrastructureError);
    assert.deepEqual([calls.holds, await d.getRoundBookings('r1')], [[], []]);
  });
  test('two customers on different tables: Somchai table 1, Malee table 2 -> both Held, two holds reported', async () => {
    const [a, b] = [await hold(SOMCHAI, 1), await hold(MALEE, 2)];
    assert.deepEqual([a.status, b.status, calls.holds.map((h) => h.tableNumber)], ['Held', 'Held', [1, 2]]);
    assert.deepEqual((await d.getRoundBookings('r1')).map((x) => x.customerId), [SOMCHAI, MALEE]);
  });
  test('the same customer holding the same table twice: second hold -> conflict, one booking only', async () => {
    const a = await hold(SOMCHAI, 1);
    await rejected(hold(SOMCHAI, 1), 'conflict', /just been taken/);
    assert.deepEqual((await d.getCustomerBookings(SOMCHAI)).map((x) => x.id), [a.id]);
  });
  // BRULE-02: the hold ends holdPeriodMinutes after the hold, from the round's own parameter.
  //  holdPeriodMinutes | holdEndsAt - createdAt | remainingHoldSeconds at the hold
  for (const [minutes, seconds] of [[0, 0], [1, 60], [15, 900], [60, 3600]] as const)
    test(`BRULE-02 hold period ${minutes} min -> holdEndsAt = createdAt + ${minutes} min, ${seconds} s remaining`, async (t) => {
      freeze(t); roundIs({ holdPeriodMinutes: minutes })();
      const b = await hold();
      assert.deepEqual([b.createdAt, b.holdEndsAt, b.remainingHoldSeconds, calls.holds[0]?.holdEndsAt], [iso(NOW), iso(NOW + minutes * MINUTE), seconds, b.holdEndsAt]);
    });
});

describe('setPartySize', () => {
  test('computes the fee: package price plus the extra persons times the extra-person fee (BRULE-08, BRULE-09)', async () => {
    const b = await d.createHeldBooking(SOMCHAI, { roundId: 'r1', tableNumber: 1 });
    const seven = await d.setPartySize(b.id, SOMCHAI, { partySize: 7 });
    assert.deepEqual(seven.fee, { packagePrice: 7200, extraPersons: 1, extraPersonFee: 600, fullTableFee: 7800 });
    const four = await d.setPartySize(b.id, SOMCHAI, { partySize: 4 });
    assert.deepEqual([four.partySize, four.fee?.extraPersons, four.fee?.fullTableFee], [4, 0, 7200]);
  });
  test('validates the party size, the owner and the state', async () => {
    const b = await d.createHeldBooking(SOMCHAI, { roundId: 'r1', tableNumber: 1 });
    await rejected(d.setPartySize(b.id, SOMCHAI, { partySize: 0 }), 'invalid');
    await rejected(d.setPartySize(b.id, SOMCHAI, { partySize: 2.5 }), 'invalid');
    await rejected(d.setPartySize(b.id, MALEE, { partySize: 2 }), 'not_found');
    concertRound.getRoundPricing = async (roundId) => ({ roundId, prices: [], extraPersonFee: 600 });
    await rejected(d.setPartySize(b.id, SOMCHAI, { partySize: 2 }), 'conflict');                      // no package price for the table
  });
});

describe('setPartySize: equivalence classes and boundaries (BRULE-08, BRULE-09)', () => {
  // The fee is the package price of the table type in its zone (BRULE-08) plus 600 per person above the capacity
  // (BRULE-09). Table 1: capacity 6, package 7,200. Table 2: capacity 2, package 2,400. The state is checked before the
  // value, the owner before both (FR-40). A refused request stores nothing.
  //  class                          | input (table 1 unless said)         | expected
  //  invalid: zero                  | 0                                   | invalid
  //  boundary: minimum              | 1                                   | fee 7,200, 0 extra
  //  valid: below capacity          | 4                                   | fee 7,200, 0 extra
  //  boundary: capacity             | 6                                   | fee 7,200, 0 extra
  //  boundary: capacity + 1         | 7                                   | fee 7,800, 1 extra
  //  valid: capacity + 3            | 9                                   | fee 9,000, 3 extra
  //  boundary: minimum (table 2)    | 1                                   | fee 2,400, 0 extra
  //  boundary: capacity (table 2)   | 2                                   | fee 2,400, 0 extra
  //  boundary: capacity + 1 (tbl 2) | 3                                   | fee 3,000, 1 extra
  //  invalid: fraction              | 2.5                                 | invalid
  //  invalid: negative              | -1                                  | invalid
  //  invalid: missing               | undefined                           | invalid
  //  invalid: not a number          | NaN, Infinity                       | invalid
  //  wrong state: Cancelled         | 2 on a Cancelled booking            | conflict
  //  wrong state: Expired           | 2 on an Expired booking             | conflict
  //  wrong state before the value   | 0 on a Cancelled booking            | conflict
  //  another customer               | 2 by Malee on Somchai's booking     | not_found
  //  unknown booking                | 2 on 'nope'                         | not_found
  //  no package price for the table | 2, pricing without sofa6            | conflict
  //  value replaced                 | 7 then 4                            | the fee follows the last value (first test above)
  type Fee = NonNullable<d.BookingView['fee']>;
  const fee = (packagePrice: number, extraPersons: number): Fee => ({ packagePrice, extraPersons, extraPersonFee: 600, fullTableFee: packagePrice + extraPersons * 600 });
  type Row = { cls: string; partySize?: number; tableNumber?: number; state?: 'Cancelled' | 'Expired'; by?: string; id?: string; arrange?: () => void; expect: Fee | d.DomainError['kind'] };
  const rows: Row[] = [
    { cls: 'invalid zero: 0 -> invalid', partySize: 0, expect: 'invalid' },
    { cls: 'boundary minimum: 1 -> 7200, no extra person', partySize: 1, expect: fee(7200, 0) },
    { cls: 'valid below capacity: 4 -> 7200, no extra person', partySize: 4, expect: fee(7200, 0) },
    { cls: 'boundary capacity: 6 -> 7200, no extra person', partySize: 6, expect: fee(7200, 0) },
    { cls: 'boundary capacity + 1: 7 -> 7800, one extra person', partySize: 7, expect: fee(7200, 1) },
    { cls: 'valid capacity + 3: 9 -> 9000, three extra persons', partySize: 9, expect: fee(7200, 3) },
    { cls: 'boundary minimum on table 2: 1 -> 2400, no extra person', partySize: 1, tableNumber: 2, expect: fee(2400, 0) },
    { cls: 'boundary capacity on table 2: 2 -> 2400, no extra person', partySize: 2, tableNumber: 2, expect: fee(2400, 0) },
    { cls: 'boundary capacity + 1 on table 2: 3 -> 3000, one extra person', partySize: 3, tableNumber: 2, expect: fee(2400, 1) },
    { cls: 'invalid fraction: 2.5 -> invalid', partySize: 2.5, expect: 'invalid' },
    { cls: 'invalid negative: -1 -> invalid', partySize: -1, expect: 'invalid' },
    { cls: 'invalid missing: undefined -> invalid', expect: 'invalid' },
    { cls: 'invalid not a number: NaN -> invalid', partySize: NaN, expect: 'invalid' },
    { cls: 'invalid not a number: Infinity -> invalid', partySize: Infinity, expect: 'invalid' },
    { cls: 'wrong state Cancelled: 2 -> conflict', partySize: 2, state: 'Cancelled', expect: 'conflict' },
    { cls: 'wrong state Expired: 2 -> conflict', partySize: 2, state: 'Expired', expect: 'conflict' },
    { cls: 'wrong state before the value: 0 on a Cancelled booking -> conflict, not invalid', partySize: 0, state: 'Cancelled', expect: 'conflict' },
    { cls: "another customer: 2 by Malee on Somchai's booking -> not_found (FR-40)", partySize: 2, by: MALEE, expect: 'not_found' },
    { cls: "unknown booking: 2 on 'nope' -> not_found", partySize: 2, id: 'nope', expect: 'not_found' },
    { cls: 'no package price for the table type: 2 with a pricing without sofa6 -> conflict', partySize: 2, arrange: () => { concertRound.getRoundPricing = async (roundId) => ({ roundId, prices: [{ zoneId: 'A', tableTypeId: 'round2', packagePrice: 2400, packageContent: '' }], extraPersonFee: 600 }); }, expect: 'conflict' },
    { cls: 'no package price in the zone: 2 with sofa6 priced in zone B only -> conflict', partySize: 2, arrange: () => { concertRound.getRoundPricing = async (roundId) => ({ roundId, prices: [{ zoneId: 'B', tableTypeId: 'sofa6', packagePrice: 7200, packageContent: '' }], extraPersonFee: 600 }); }, expect: 'conflict' },
  ];
  for (const r of rows) test(r.cls, async () => {
    const b = await hold(SOMCHAI, r.tableNumber ?? 1);
    if (r.state === 'Cancelled') await d.cancelBooking(b.id, SOMCHAI);
    if (r.state === 'Expired') await expire(b);
    r.arrange?.();
    const p = d.setPartySize(r.id ?? b.id, r.by ?? SOMCHAI, { partySize: r.partySize });
    if (typeof r.expect === 'string') { await rejected(p, r.expect); assert.deepEqual([(await d.getBooking(b.id, SOMCHAI)).partySize, (await d.getBooking(b.id, SOMCHAI)).fee], [null, null]); }
    else { const v = await p; assert.deepEqual([v.partySize, v.fee], [r.partySize, r.expect]); assert.deepEqual((await d.getBooking(b.id, SOMCHAI)).fee, r.expect); }
  });
});

describe('getBooking', () => {
  test('another customer gets 404, not 403 (FR-40)', async () => {
    const b = await d.createHeldBooking(SOMCHAI, { roundId: 'r1', tableNumber: 1 });
    await rejected(d.getBooking(b.id, MALEE), 'not_found');
    await rejected(d.getBooking('nope', SOMCHAI), 'not_found');
    assert.deepEqual((await d.getCustomerBookings(SOMCHAI)).map((x) => x.id), [b.id]);
    assert.deepEqual((await d.getRoundBookings('r1')).map((x) => x.id), [b.id]);
  });
  // The lists (FR-40 the customer's own, FR-42 the round's live view), with Somchai on r1/1 and r2/1 and Malee on r1/2.
  //  list                          | expected
  //  getCustomerBookings(Somchai)  | r1/1, r2/1 in creation order, as views
  //  getCustomerBookings(Malee)    | r1/2
  //  getCustomerBookings(nobody)   | []
  //  getRoundBookings(r1)          | Somchai r1/1, Malee r1/2
  //  getRoundBookings(r2)          | Somchai r2/1
  //  getRoundBookings(r3)          | []
  test('lists: Somchai r1/1 + r2/1, Malee r1/2 -> each customer and each round sees its own bookings only', async () => {
    await hold(SOMCHAI, 1, 'r1'); await hold(MALEE, 2, 'r1'); await hold(SOMCHAI, 1, 'r2');
    const key = (x: { roundId: string; tableNumber: number }) => `${x.roundId}/${x.tableNumber}`;
    assert.deepEqual([(await d.getCustomerBookings(SOMCHAI)).map(key), (await d.getCustomerBookings(MALEE)).map(key), await d.getCustomerBookings('U-nobody')], [['r1/1', 'r2/1'], ['r1/2'], []]);
    assert.deepEqual([(await d.getRoundBookings('r1')).map(key), (await d.getRoundBookings('r2')).map(key), await d.getRoundBookings('r3')], [['r1/1', 'r1/2'], ['r2/1'], []]);
    assert.ok((await d.getCustomerBookings(SOMCHAI)).every((x) => x.remainingHoldSeconds > 0), 'the customer sees views');
  });
});

describe('terms and payment', () => {
  test('the terms carry the check-in window; acceptance is recorded; payment is not built yet', async () => {
    const b = await d.createHeldBooking(SOMCHAI, { roundId: 'r1', tableNumber: 1 });
    const terms = await d.getBookingTerms(b.id, SOMCHAI);
    assert.equal(terms.checkInWindow.graceEndsAt, '2026-12-24T20:30:00.000Z');
    assert.equal(terms.terms.length, 4);
    await rejected(d.startPayment(b.id, SOMCHAI), 'conflict');                                         // no fee, no accepted terms yet
    assert.equal((await d.acceptBookingTerms(b.id, SOMCHAI)).termsAccepted, true);
    await d.setPartySize(b.id, SOMCHAI, { partySize: 2 });
    await rejected(d.startPayment(b.id, SOMCHAI), 'not_implemented');
  });
  // getBookingTerms (FR-12, BRULE-16) and startPayment (UC-01 step 15), the owner check (FR-40) and what paying needs.
  //  case                                           | expected
  //  terms text, window 18:00Z-20:30Z               | venue-local (Asia/Bangkok) times "25 Dec 2026, 01:00" / "03:30" in the text, the window as answered
  //  terms by another customer                      | not_found
  //  accept by another customer                     | not_found
  //  accept twice                                   | still accepted (idempotent)
  //  startPayment: terms only / fee only / both     | conflict / conflict / not_implemented (progress 2)
  //  startPayment by another customer               | not_found
  test('terms text: window 18:00Z-20:30Z -> "Check-in opens 25 Dec 2026, 01:00" and "kept until 25 Dec 2026, 03:30", the window as answered', async () => {
    const b = await hold();
    const t = await d.getBookingTerms(b.id, SOMCHAI);
    assert.match(t.terms[1], /Check-in opens 25 Dec 2026, 01:00 \(2 hours before the show\)/);
    assert.match(t.terms[2], /kept until 25 Dec 2026, 03:30 \(30 minutes after the start\)/);
    assert.deepEqual([t.bookingId, t.checkInWindow], [b.id, { roundId: 'r1', opensAt: '2026-12-24T18:00:00.000Z', startAt: '2026-12-24T20:00:00.000Z', graceEndsAt: '2026-12-24T20:30:00.000Z' }]);
  });
  test("terms, accept and pay by another customer: Malee on Somchai's booking -> not_found each", async () => {
    const b = await hold();
    await rejected(d.getBookingTerms(b.id, MALEE), 'not_found'); await rejected(d.acceptBookingTerms(b.id, MALEE), 'not_found'); await rejected(d.startPayment(b.id, MALEE), 'not_found');
    assert.equal((await d.getBooking(b.id, SOMCHAI)).termsAccepted, false);
  });
  test('accept twice: -> termsAccepted stays true, no transition in the history', async () => {
    const b = await hold();
    await d.acceptBookingTerms(b.id, SOMCHAI);
    const v = await d.acceptBookingTerms(b.id, SOMCHAI);
    assert.deepEqual([v.termsAccepted, v.history.length], [true, 1]);
  });
  test('startPayment: terms accepted but no fee -> conflict', async () => { const b = await hold(); await d.acceptBookingTerms(b.id, SOMCHAI); await rejected(d.startPayment(b.id, SOMCHAI), 'conflict'); });
  test('startPayment: fee set but terms not accepted -> conflict', async () => { const b = await hold(); await d.setPartySize(b.id, SOMCHAI, { partySize: 2 }); await rejected(d.startPayment(b.id, SOMCHAI), 'conflict'); });
  test('startPayment: fee set and terms accepted -> not_implemented (the Payment Service comes in progress 2)', async () => {
    const b = await hold(); await d.setPartySize(b.id, SOMCHAI, { partySize: 2 }); await d.acceptBookingTerms(b.id, SOMCHAI);
    await rejected(d.startPayment(b.id, SOMCHAI), 'not_implemented', /progress 2/);
  });
});

describe('cancelBooking', () => {
  test('Held -> Cancelled with a history entry and the hold released in the read model', async () => {
    const b = await d.createHeldBooking(SOMCHAI, { roundId: 'r1', tableNumber: 1 });
    const c = await d.cancelBooking(b.id, SOMCHAI);
    assert.equal(c.status, 'Cancelled');
    assert.equal(c.remainingHoldSeconds, 0);
    assert.deepEqual(c.history.map((h) => [h.status, h.by]), [['Held', SOMCHAI], ['Cancelled', SOMCHAI]]);
    assert.deepEqual(calls.releases, [{ roundId: 'r1', tableNumber: 1, bookingId: b.id }]);
    await rejected(d.cancelBooking(b.id, SOMCHAI), 'conflict');                                        // already Cancelled
    await rejected(d.cancelBooking(b.id, MALEE), 'not_found');
    assert.equal((await d.createHeldBooking(MALEE, { roundId: 'r1', tableNumber: 1 })).status, 'Held');   // the table is free again
  });
  test('cancel a prepared booking: party size, fee and terms are kept on the Cancelled record (the audit trail)', async () => {
    const b = await hold(); await d.setPartySize(b.id, SOMCHAI, { partySize: 7 }); await d.acceptBookingTerms(b.id, SOMCHAI);
    const c = await d.cancelBooking(b.id, SOMCHAI);
    assert.deepEqual([c.status, c.partySize, c.fee?.fullTableFee, c.termsAccepted], ['Cancelled', 7, 7800, true]);
  });
  test('cancel releases only its own table: Somchai cancels r1/1 -> r1/2 of Malee stays held', async () => {
    const a = await hold(SOMCHAI, 1); await hold(MALEE, 2);
    await d.cancelBooking(a.id, SOMCHAI);
    assert.deepEqual(calls.releases.map((r) => r.tableNumber), [1]);
    await rejected(hold(SOMCHAI, 2), 'conflict', /just been taken/);
  });
});

describe('state × operation (state-transition testing)', () => {
  // The states a booking reaches in progress 1 × the operations of UC-01. Confirmed, Checked-in and No-show cannot be
  // reached (startPayment() is built in progress 2), so they have no row. Expired is reached through the expiry job with
  // a clock past the hold end. "prepared" = party size set and terms accepted, what startPayment() needs.
  //  state \ operation | getBooking | getBookingTerms | setPartySize | acceptBookingTerms | startPayment unprepared / prepared | cancelBooking
  //  Held              | ok         | ok              | ok           | ok                 | conflict / not_implemented         | ok -> Cancelled
  //  Cancelled         | ok (0 s)   | ok              | conflict     | conflict           | conflict / conflict                | conflict
  //  Expired           | ok (0 s)   | ok              | conflict     | conflict           | conflict / conflict                | conflict
  // A refused operation leaves the booking as it was (status and history). A read never changes it.
  type State = 'Held' | 'Cancelled' | 'Expired';
  const reach = async (state: State, prepared = false): Promise<d.BookingView> => {
    const b = await hold();
    if (prepared) { await d.setPartySize(b.id, SOMCHAI, { partySize: 2 }); await d.acceptBookingTerms(b.id, SOMCHAI); }
    if (state === 'Cancelled') await d.cancelBooking(b.id, SOMCHAI);
    if (state === 'Expired') await expire(b);
    return d.getBooking(b.id, SOMCHAI);
  };
  const ops = {
    getBooking: (id: string) => d.getBooking(id, SOMCHAI),
    getBookingTerms: (id: string) => d.getBookingTerms(id, SOMCHAI),
    setPartySize: (id: string) => d.setPartySize(id, SOMCHAI, { partySize: 2 }),
    acceptBookingTerms: (id: string) => d.acceptBookingTerms(id, SOMCHAI),
    startPayment: (id: string) => d.startPayment(id, SOMCHAI),
    cancelBooking: (id: string) => d.cancelBooking(id, SOMCHAI),
  };
  type Cell = { state: State; op: keyof typeof ops; prepared?: boolean; expect: 'ok' | d.DomainError['kind']; after?: State; todo?: string };
  const cells: Cell[] = [
    { state: 'Held', op: 'getBooking', expect: 'ok' },
    { state: 'Held', op: 'getBookingTerms', expect: 'ok' },
    { state: 'Held', op: 'setPartySize', expect: 'ok' },
    { state: 'Held', op: 'acceptBookingTerms', expect: 'ok' },
    { state: 'Held', op: 'startPayment', expect: 'conflict' },
    { state: 'Held', op: 'startPayment', prepared: true, expect: 'not_implemented' },
    { state: 'Held', op: 'cancelBooking', expect: 'ok', after: 'Cancelled' },
    { state: 'Cancelled', op: 'getBooking', expect: 'ok' },
    { state: 'Cancelled', op: 'getBookingTerms', expect: 'ok' },
    { state: 'Cancelled', op: 'setPartySize', expect: 'conflict' },
    { state: 'Cancelled', op: 'acceptBookingTerms', expect: 'conflict' },
    { state: 'Cancelled', op: 'startPayment', expect: 'conflict' },
    { state: 'Cancelled', op: 'startPayment', prepared: true, expect: 'conflict' },
    { state: 'Cancelled', op: 'cancelBooking', expect: 'conflict' },
    { state: 'Expired', op: 'getBooking', expect: 'ok' },
    { state: 'Expired', op: 'getBookingTerms', expect: 'ok' },
    { state: 'Expired', op: 'setPartySize', expect: 'conflict' },
    { state: 'Expired', op: 'acceptBookingTerms', expect: 'conflict' },
    { state: 'Expired', op: 'startPayment', expect: 'conflict' },
    { state: 'Expired', op: 'startPayment', prepared: true, expect: 'conflict' },
    { state: 'Expired', op: 'cancelBooking', expect: 'conflict' },
  ];
  for (const c of cells) {
    const name = `${c.state}${c.prepared ? ' (prepared)' : ''} × ${c.op} -> ${c.expect}${c.after ? ` -> ${c.after}` : ''}`;
    const run = async () => {
      const before = await reach(c.state, c.prepared);
      assert.equal(before.status, c.state);
      const p = ops[c.op](before.id);
      if (c.expect === 'ok') await p; else await rejected(p, c.expect);
      const after = await d.getBooking(before.id, SOMCHAI);
      assert.equal(after.status, c.after ?? c.state);
      assert.equal(after.remainingHoldSeconds > 0, after.status === 'Held', 'only a Held booking has time left');
      if (c.expect !== 'ok') assert.deepEqual(after.history, before.history, 'a refused operation changes nothing');
    };
    if (c.todo) test.todo(`${name} (observed: ${c.todo})`, run); else test(name, run);
  }
  test('Expired is reached only through the job: a Held booking past its hold end is still Held until the job runs', async (t) => {
    freeze(t);
    const b = await hold();
    t.mock.timers.setTime(NOW + 16 * MINUTE);
    assert.deepEqual([(await d.getBooking(b.id, SOMCHAI)).status, (await d.getBooking(b.id, SOMCHAI)).remainingHoldSeconds], ['Held', 0]);
    await expire(b);
    assert.equal((await d.getBooking(b.id, SOMCHAI)).status, 'Expired');
  });
});
