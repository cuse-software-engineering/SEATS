// Unit tests of domain/expiry.ts (UC-01 EF-1 hold expiry: FR-23, BRULE-02, ADR-08): the job on the service's own timer
// that expires the unpaid holds. The clock is the job's `now` argument, so every boundary is exact. The collaborators
// are the stubs of test/fixtures.ts.
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain/index.js';
import { concertRound, tableAvailability } from '../src/infrastructure/clients.js';
import { resetStore, wire } from '../src/infrastructure/index.js';
import { calls, MALEE, MINUTE, quietly, rejected, round, SOMCHAI, stubCollaborators } from './fixtures.js';

wire();   // binds the in-memory repositories and the client objects to the domain's ports

beforeEach(async () => { await resetStore(); stubCollaborators(); });

const hold = (customerId = SOMCHAI, tableNumber = 1) => d.createHeldBooking(customerId, { roundId: 'r1', tableNumber });
const job = (now?: number) => quietly(() => d.expireUnpaidBookings(now));
const status = async (b: d.BookingView) => (await d.getBooking(b.id, b.customerId)).status;

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
    assert.deepEqual(calls.releases, [{ roundId: 'r1', tableNumber: 1, bookingId: overdue.id }]);
  });
});

describe('expireUnpaidBookings: boundaries of the hold end (BRULE-02, ADR-08)', () => {
  // The job takes the Held bookings whose holdEndsAt <= now (repository heldEndingBy). E = the hold end of a fresh
  // 15-minute hold; the clock is the argument of the job.
  //  class                               | now         | expected
  //  hold ends after now                 | E - 1 ms    | kept: [], still Held, no release
  //  hold ends exactly at now            | E           | expired (the rule is <=), the table released
  //  hold ended before now               | E + 1 ms    | expired
  //  hold ended long before now          | E + 1 day   | expired
  //  default clock, fresh hold           | (none)      | kept
  //  zero hold period                    | (none)      | expired at once: E = the time of the hold
  //  Cancelled booking, hold end passed  | E + 1 ms    | not taken: stays Cancelled, no second release
  //  already Expired, run again          | E + 1 ms    | idempotent: [], one Expired entry in the history
  //  two holds, one overdue              | E1 + 1 ms   | only the overdue one; its lock released, the other still held
  //  several overdue                     | far ahead   | all of them, in creation order, one release each
  //  read model down on releaseHold      | E + 1 ms    | Expired all the same, the lock released, a warning logged, the id answered
  type Row = { cls: string; at: (E: number) => number | undefined; expect: 'kept' | 'expired' };
  const rows: Row[] = [
    { cls: 'hold ends after now: E - 1 ms -> kept', at: (E) => E - 1, expect: 'kept' },
    { cls: 'hold ends exactly at now: E -> expired (the rule is <=)', at: (E) => E, expect: 'expired' },
    { cls: 'hold ended before now: E + 1 ms -> expired', at: (E) => E + 1, expect: 'expired' },
    { cls: 'hold ended long before now: E + 1 day -> expired', at: (E) => E + 1440 * MINUTE, expect: 'expired' },
    { cls: 'default clock on a fresh 15-minute hold: (none) -> kept', at: () => undefined, expect: 'kept' },
  ];
  for (const r of rows) test(r.cls, async () => {
    const b = await hold();
    const E = Date.parse(b.holdEndsAt);
    assert.deepEqual(await job(r.at(E)), r.expect === 'expired' ? [b.id] : []);
    assert.equal(await status(b), r.expect === 'expired' ? 'Expired' : 'Held');
    assert.deepEqual(calls.releases, r.expect === 'expired' ? [{ roundId: 'r1', tableNumber: 1, bookingId: b.id }] : []);
  });
  test('zero hold period: holdPeriodMinutes 0, default clock -> expired at once (E = the time of the hold)', async () => {
    concertRound.getRound = async () => round({ holdPeriodMinutes: 0 });
    const b = await hold();
    assert.deepEqual([b.holdEndsAt, b.remainingHoldSeconds, await job()], [b.createdAt, 0, [b.id]]);
  });
  test('Cancelled booking with a past hold end: E + 1 ms -> not taken, stays Cancelled, released once (by the cancel)', async () => {
    const b = await hold(); await d.cancelBooking(b.id, SOMCHAI);
    assert.deepEqual(await job(Date.parse(b.holdEndsAt) + 1), []);
    assert.deepEqual([await status(b), calls.releases.length, (await d.getBooking(b.id, SOMCHAI)).history.map((h) => h.status)], ['Cancelled', 1, ['Held', 'Cancelled']]);
  });
  test('idempotent: the same clock twice -> the second run finds nothing, one Expired entry, one release', async () => {
    const b = await hold(); const now = Date.parse(b.holdEndsAt) + 1;
    assert.deepEqual([await job(now), await job(now), await job(now + MINUTE)], [[b.id], [], []]);
    assert.deepEqual([(await d.getBooking(b.id, SOMCHAI)).history.map((h) => h.status), calls.releases.length], [['Held', 'Expired'], 1]);
  });
  test('two holds, one overdue: the lock is released only for the expired booking -> its table can be held again, the other not', async () => {
    const a = await hold(SOMCHAI, 1);
    concertRound.getRound = async () => round({ holdPeriodMinutes: 60 });
    const b = await hold(MALEE, 2);
    assert.deepEqual(await job(Date.parse(a.holdEndsAt) + 1), [a.id]);
    assert.deepEqual([await status(a), await status(b), calls.releases], ['Expired', 'Held', [{ roundId: 'r1', tableNumber: 1, bookingId: a.id }]]);
    stubCollaborators();
    assert.equal((await hold(MALEE, 1)).status, 'Held');                                                 // table 1 is free again
    await rejected(hold(SOMCHAI, 2), 'conflict', /just been taken/);                                         // table 2 is still Malee's
  });
  test('several overdue: tables 1 and 2 of two customers -> both expired in creation order, one release each', async () => {
    const a = await hold(SOMCHAI, 1); const b = await hold(MALEE, 2);
    assert.deepEqual(await job(Date.parse(b.holdEndsAt) + 1), [a.id, b.id]);
    assert.deepEqual([await status(a), await status(b), calls.releases.map((r) => r.tableNumber)], ['Expired', 'Expired', [1, 2]]);
  });
  test('read model down on releaseHold: -> the booking is Expired all the same, the lock released, a warning logged, the id answered', async () => {
    const b = await hold();
    tableAvailability.releaseHold = async () => { throw new d.InfrastructureError('the Table Availability Service', 'did not answer'); };
    const warned: string[] = []; const { log, warn } = console; console.log = () => {}; console.warn = (line: string) => { warned.push(line); };   // the job's own lines, captured
    try { assert.deepEqual(await d.expireUnpaidBookings(Date.parse(b.holdEndsAt) + 1), [b.id]); } finally { console.log = log; console.warn = warn; }
    assert.deepEqual([await status(b), warned.length, warned[0]?.includes('releaseHold retry later')], ['Expired', 1, true]);
    stubCollaborators();
    assert.equal((await hold(MALEE, 1)).status, 'Held');                                                 // the lock did not survive the failure
  });
});
