// Unit tests of the Booking Service domain: the hold, the fee, cancel and the expiry job (UC-01, ADR-13). The Concert
// Round and Table Availability clients are replaced by stubs on the client objects themselves.
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain.js';
import { concertRound, tableAvailability, GRPC_STATUS } from '../src/clients.js';
import { resetStore } from '../src/store.js';
import type { Round__Output } from '@seats/proto/gen/seats/concertround/v1/Round';
import type { TableRef } from '@seats/proto/gen/seats/tableavailability/v1/TableRef';
import type { HoldTableRequest } from '@seats/proto/gen/seats/tableavailability/v1/HoldTableRequest';
import type { TableStatus__Output } from '@seats/proto/gen/seats/tableavailability/v1/TableStatus';

const rejected = (p: Promise<unknown>, kind: d.DomainError['kind']) => assert.rejects(p, (e: unknown) => e instanceof d.DomainError && e.kind === kind);
const SOMCHAI = 'U-somchai', MALEE = 'U-malee';
const PAST = '2026-01-01T00:00:00.000Z';
const table = (tableNumber: number, forSale = true) => ({ tableNumber, zoneId: 'A', zoneName: 'Zone A', tableTypeId: tableNumber === 1 ? 'sofa6' : 'round2', tableTypeName: '', capacity: tableNumber === 1 ? 6 : 2, forSale, x: 0, y: 0, packagePrice: tableNumber === 1 ? 7200 : 2400, packageContent: '' });
const round = (over: Partial<Round__Output> = {}): Round__Output => ({
  id: 'r1', name: 'Friday Live', artist: 'The Band', status: 'Published', date: '2026-12-24', doorsOpenAt: '2026-12-24T18:00:00.000Z', startAt: '2026-12-24T20:00:00.000Z', bookingOpenAt: PAST,
  zoneMapId: 'm1', tablesNotForSale: [3], prices: [], checkInWindow: null, parameters: null, createdAt: PAST, holdPeriodMinutes: 15, tables: [table(1), table(2), table(3, false)], ...over,
});
const asTable = (req: TableRef | HoldTableRequest, status: string): TableStatus__Output => ({ tableNumber: req.tableNumber ?? 0, status, bookingId: req.bookingId ?? '', holdEndsAt: '' });
let holds: HoldTableRequest[] = [];
let releases: TableRef[] = [];

beforeEach(async () => {
  await resetStore();
  holds = [];
  releases = [];
  concertRound.getRound = async () => round();
  concertRound.getRoundPricing = async (roundId) => ({ roundId, prices: [{ zoneId: 'A', tableTypeId: 'sofa6', packagePrice: 7200, packageContent: '' }, { zoneId: 'A', tableTypeId: 'round2', packagePrice: 2400, packageContent: '' }], extraPersonFee: 600 });
  concertRound.getCheckInWindow = async (roundId) => ({ roundId, opensAt: '2026-12-24T18:00:00.000Z', startAt: '2026-12-24T20:00:00.000Z', graceEndsAt: '2026-12-24T20:30:00.000Z' });
  tableAvailability.holdTable = async (req) => { holds.push(req); return asTable(req, 'HELD'); };
  tableAvailability.releaseHold = async (req) => { releases.push(req); return asTable(req, 'AVAILABLE'); };
});

describe('createHeldBooking', () => {
  test('creates a Held booking with the table copied from the round and reports the hold to the read model', async () => {
    const b = await d.createHeldBooking(SOMCHAI, { roundId: 'r1', tableNumber: 1 });
    assert.equal(b.status, 'Held');
    assert.ok(b.remainingHoldSeconds > 0 && b.remainingHoldSeconds <= 15 * 60);
    assert.deepEqual(b.history.map((h) => [h.status, h.by]), [['Held', SOMCHAI]]);
    assert.deepEqual([b.zoneId, b.zoneName, b.tableTypeId, b.capacity, b.partySize, b.fee, b.termsAccepted], ['A', 'Zone A', 'sofa6', 6, null, null, false]);
    assert.deepEqual(holds, [{ roundId: 'r1', tableNumber: 1, bookingId: b.id, holdEndsAt: b.holdEndsAt }]);
    assert.equal((await d.getBooking(b.id, SOMCHAI)).id, b.id);
  });
  test('a second hold on the same table by another customer is refused: the first lock wins', async () => {
    await d.createHeldBooking(SOMCHAI, { roundId: 'r1', tableNumber: 1 });
    await rejected(d.createHeldBooking(MALEE, { roundId: 'r1', tableNumber: 1 }), 'conflict');
    assert.equal(holds.length, 1);
    assert.equal((await d.getCustomerBookings(MALEE)).length, 0);
    await d.createHeldBooking(MALEE, { roundId: 'r1', tableNumber: 2 });                      // another table is fine
    assert.equal(holds.length, 2);
  });
  test('a round that is not open is refused', async () => {
    concertRound.getRound = async () => round({ bookingOpenAt: new Date(Date.now() + 3600e3).toISOString() });
    await rejected(d.createHeldBooking(SOMCHAI, { roundId: 'r1', tableNumber: 1 }), 'conflict');
    concertRound.getRound = async () => round({ status: 'Draft' });
    await rejected(d.createHeldBooking(SOMCHAI, { roundId: 'r1', tableNumber: 1 }), 'conflict');
    assert.equal(holds.length, 0);
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

describe('getBooking', () => {
  test('another customer gets 404, not 403 (FR-40)', async () => {
    const b = await d.createHeldBooking(SOMCHAI, { roundId: 'r1', tableNumber: 1 });
    await rejected(d.getBooking(b.id, MALEE), 'not_found');
    await rejected(d.getBooking('nope', SOMCHAI), 'not_found');
    assert.deepEqual((await d.getCustomerBookings(SOMCHAI)).map((x) => x.id), [b.id]);
    assert.deepEqual((await d.getRoundBookings('r1')).map((x) => x.id), [b.id]);
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
});

describe('cancelBooking', () => {
  test('Held -> Cancelled with a history entry and the hold released in the read model', async () => {
    const b = await d.createHeldBooking(SOMCHAI, { roundId: 'r1', tableNumber: 1 });
    const c = await d.cancelBooking(b.id, SOMCHAI);
    assert.equal(c.status, 'Cancelled');
    assert.equal(c.remainingHoldSeconds, 0);
    assert.deepEqual(c.history.map((h) => [h.status, h.by]), [['Held', SOMCHAI], ['Cancelled', SOMCHAI]]);
    assert.deepEqual(releases, [{ roundId: 'r1', tableNumber: 1, bookingId: b.id }]);
    await rejected(d.cancelBooking(b.id, SOMCHAI), 'conflict');                                        // already Cancelled
    await rejected(d.cancelBooking(b.id, MALEE), 'not_found');
    assert.equal((await d.createHeldBooking(MALEE, { roundId: 'r1', tableNumber: 1 })).status, 'Held');   // the table is free again
  });
});

describe('expireUnpaidBookings', () => {
  test('expires only the overdue Held bookings and releases their tables', async () => {
    const overdue = await d.createHeldBooking(SOMCHAI, { roundId: 'r1', tableNumber: 1 });   // 15-minute hold
    concertRound.getRound = async () => round({ holdPeriodMinutes: 60 });
    const later = await d.createHeldBooking(MALEE, { roundId: 'r1', tableNumber: 2 });        // 60-minute hold
    const cancelled = await d.createHeldBooking(MALEE, { roundId: 'r1', tableNumber: 1 }).catch(() => null);
    assert.equal(cancelled, null);                                                              // table 1 is still held
    const log = console.log; console.log = () => {};                                            // the job logs the notice it would send
    try {
      assert.deepEqual(await d.expireUnpaidBookings(Date.now() + 20 * 60e3), [overdue.id]);
      assert.deepEqual(await d.expireUnpaidBookings(Date.now() + 20 * 60e3), []);              // nothing left to expire
    } finally { console.log = log; }
    const e = await d.getBooking(overdue.id, SOMCHAI);
    assert.equal(e.status, 'Expired');
    assert.deepEqual(e.history.map((h) => [h.status, h.by]), [['Held', SOMCHAI], ['Expired', 'hold-expiry job']]);
    assert.equal((await d.getBooking(later.id, MALEE)).status, 'Held');
    assert.deepEqual(releases, [{ roundId: 'r1', tableNumber: 1, bookingId: overdue.id }]);
  });
});
