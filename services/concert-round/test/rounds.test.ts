// Unit tests of the Concert Round Service domain: rounds (UC-03) and the customer's list (UC-01). The Table
// Availability client is replaced by stubs on the client object itself.
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain.js';
import { tableAvailability } from '../src/clients.js';
import { resetStore } from '../src/store.js';
import type { CreateRoundTableStatusRequest } from '@seats/proto/gen/seats/tableavailability/v1/CreateRoundTableStatusRequest';

const refused = (p: Promise<unknown>, status: number) => assert.rejects(p, (e: unknown) => e instanceof d.DomainError && e.status === status);
const PAST = '2026-01-01T00:00:00.000Z';
const day = (offset: number) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);   // a future date; validateRound refuses overlaps
let created: CreateRoundTableStatusRequest[] = [];
let counts: Record<string, { available: number; forSale: number }> = {};

async function activeMap(): Promise<string> {
  await d.defineTableType('sofa6', { name: '6-person sofa', capacity: 6 });
  await d.defineTableType('round2', { name: '2-person round table', capacity: 2 });
  const m = await d.createZoneMap({ name: 'Main hall' });
  await d.updateZoneMap(m.id, { zones: [{ id: 'A', name: 'Zone A' }], tables: [{ tableNumber: 1, zoneId: 'A', tableTypeId: 'sofa6', capacity: 6 }, { tableNumber: 2, zoneId: 'A', tableTypeId: 'round2', capacity: 2 }, { tableNumber: 3, zoneId: 'A', tableTypeId: 'round2', capacity: 2 }] });
  await d.activateZoneMap(m.id);
  return m.id;
}
const fullRound = (zoneMapId: string, dayOffset: number, bookingOpenAt = PAST): d.RoundPatch => ({
  artist: 'The Band', date: day(dayOffset), doorsOpenAt: `${day(dayOffset)}T18:00:00Z`, startAt: `${day(dayOffset)}T20:00:00Z`, bookingOpenAt, zoneMapId,
  tablesNotForSale: [3], prices: [{ zoneId: 'A', tableTypeId: 'sofa6', packagePrice: 7200 }, { zoneId: 'A', tableTypeId: 'round2', packagePrice: 2400 }],
});

beforeEach(async () => {
  await resetStore();
  created = [];
  counts = {};
  tableAvailability.createRoundTableStatus = async (req) => { created.push(req); return { roundId: req.roundId ?? '', version: 1, tables: [] }; };
  tableAvailability.countAvailableTables = async (roundIds) => ({ counts: roundIds.map((roundId) => ({ roundId, ...(counts[roundId] ?? { available: 0, forSale: 0 }) })) });
});

describe('createRound and validateRound', () => {
  test('a new round is a Draft with nothing set', async () => {
    const r = await d.createRound({ name: 'Friday Live' });
    assert.equal(r.status, 'Draft');
    assert.equal(r.name, 'Friday Live');
    assert.deepEqual([r.zoneMapId, r.checkInWindow, r.parameters, r.prices], ['', null, null, []]);
  });
  test('an empty round is invalid', async () => {
    const v = await d.validateRound((await d.createRound()).id);
    assert.equal(v.valid, false);
    assert.ok(v.problems.includes('date, doors-open time, start time and booking-open time are required'));
    assert.ok(v.problems.includes('the round has no zone map'));
  });
  test('a for-sale table without a package price is a problem; a table not for sale needs none', async () => {
    const map = await activeMap();
    const r = await d.createRound();
    await d.updateRound(r.id, { ...fullRound(map, 3), prices: [{ zoneId: 'A', tableTypeId: 'sofa6', packagePrice: 7200 }] });
    assert.deepEqual((await d.validateRound(r.id)).problems, ['no package price for 2-person round table in Zone A']);
    await d.updateRound(r.id, { tablesNotForSale: [2, 3] });
    assert.equal((await d.validateRound(r.id)).valid, true);
  });
});

describe('updateRound', () => {
  test('derives the check-in window when the start time is set (BRULE-04, BRULE-05)', async () => {
    const r = await d.createRound();
    const u = await d.updateRound(r.id, { startAt: '2026-12-24T20:00:00Z' });
    assert.deepEqual(u.checkInWindow, { opensAt: '2026-12-24T18:00:00.000Z', startAt: '2026-12-24T20:00:00.000Z', graceEndsAt: '2026-12-24T20:30:00.000Z' });
    await d.updateBusinessParameters({ checkInWindowHours: 3, gracePeriodMinutes: 45 });
    const again = await d.updateRound(r.id, { name: 'x' });
    assert.deepEqual([again.checkInWindow?.opensAt, again.checkInWindow?.graceEndsAt], ['2026-12-24T17:00:00.000Z', '2026-12-24T20:45:00.000Z']);
  });
  test('a field left out is unchanged', async () => {
    const r = await d.createRound({ name: 'Friday Live' });
    const u = await d.updateRound(r.id, { artist: 'The Band' });
    assert.deepEqual([u.name, u.artist], ['Friday Live', 'The Band']);
  });
});

describe('publishRound', () => {
  test('refuses an invalid round with the problems as details', async () => {
    const r = await d.createRound();
    await assert.rejects(d.publishRound(r.id), (e: unknown) => e instanceof d.DomainError && e.status === 400 && Array.isArray(e.details) && e.details.length > 0);
    assert.equal(created.length, 0);
  });
  test('sets Published, snapshots the parameters and creates the table status once', async () => {
    const map = await activeMap();
    const r = await d.createRound();
    await d.updateRound(r.id, fullRound(map, 3));
    await d.updateBusinessParameters({ holdPeriodMinutes: 20 });
    const p = await d.publishRound(r.id);
    assert.equal(p.status, 'Published');
    assert.deepEqual(p.parameters, { holdPeriodMinutes: 20, checkInWindowHours: 2, gracePeriodMinutes: 30, extraPersonFee: 600 });
    assert.equal(created.length, 1);
    assert.deepEqual(created[0], { roundId: r.id, tables: [{ tableNumber: 1, forSale: true }, { tableNumber: 2, forSale: true }, { tableNumber: 3, forSale: false }] });
    await d.updateBusinessParameters({ holdPeriodMinutes: 5 });                                  // later changes do not touch the snapshot (FR-38)
    assert.equal((await d.getRound(r.id)).holdPeriodMinutes, 20);
    assert.equal((await d.getRoundPricing(r.id)).extraPersonFee, 600);
    assert.equal((await d.publishRound(r.id)).status, 'Published');                            // idempotent (EF-2)
    assert.equal(created.length, 1);
  });
});

describe('discardDraftRound', () => {
  test('removes a Draft and refuses a Published round', async () => {
    const draft = await d.createRound();
    assert.deepEqual(await d.discardDraftRound(draft.id), { removed: true });
    await refused(d.getRound(draft.id), 404);
    const map = await activeMap();
    const r = await d.createRound();
    await d.updateRound(r.id, fullRound(map, 3));
    await d.publishRound(r.id);
    await refused(d.discardDraftRound(r.id), 409);
  });
});

describe('getUpcomingRounds', () => {
  test('lists the published rounds in start order as not yet open, open or sold out', async () => {
    const map = await activeMap();
    const ids: string[] = [];
    for (const [offset, open] of [[5, PAST], [3, new Date(Date.now() + 3600e3).toISOString()], [7, PAST]] as const) {
      const r = await d.createRound({ name: `day+${offset}` });
      await d.updateRound(r.id, fullRound(map, offset, open));
      await d.publishRound(r.id);
      ids.push(r.id);
    }
    await d.createRound({ name: 'draft' });
    counts = { [ids[0]]: { available: 0, forSale: 2 }, [ids[2]]: { available: 1, forSale: 2 } };
    const list = await d.getUpcomingRounds();
    assert.deepEqual(list.map((r) => [r.name, r.status, r.availableTables, r.tablesForSale]), [['day+3', 'not yet open', 0, 0], ['day+5', 'sold out', 0, 2], ['day+7', 'open', 1, 2]]);
  });
  test('is empty without a published round and does not call the Table Availability Service', async () => {
    await d.createRound();
    tableAvailability.countAvailableTables = async () => { throw new Error('must not be called'); };
    assert.deepEqual(await d.getUpcomingRounds(), []);
  });
});

describe('getCheckInWindow', () => {
  test('needs a start time', async () => {
    const r = await d.createRound();
    await refused(d.getCheckInWindow(r.id), 409);
    await d.updateRound(r.id, { startAt: '2026-12-24T20:00:00Z' });
    assert.equal((await d.getCheckInWindow(r.id)).roundId, r.id);
    await refused(d.updateRound('nope', {}), 404);
  });
});
