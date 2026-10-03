// Unit tests of the Concert Round Service domain: business parameters (UC-07, FR-38; BRULE-02, 04, 05, 09). Test design:
// equivalence classes with boundary values per field (the table in the header of the describe) and the snapshot a
// published round keeps (FR-38), one test per row. The Table Availability client is stubbed on the client object.
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain/index.js';
import { tableAvailability } from '../src/infrastructure/clients.js';
import { resetStore, wire } from '../src/infrastructure/index.js';
wire();   // the in-memory repositories and the client object behind the domain's ports, once per process

const refused = (p: Promise<unknown>, kind: d.DomainError['kind']) => assert.rejects(p, (e: unknown) => e instanceof d.DomainError && e.kind === kind);
const DEFAULTS: d.BusinessParameters = { holdPeriodMinutes: 15, checkInWindowHours: 2, gracePeriodMinutes: 30, extraPersonFee: 600 };   // BRULE-02, 04, 05, 09
const TYPICAL: d.BusinessParameters = { holdPeriodMinutes: 20, checkInWindowHours: 3, gracePeriodMinutes: 45, extraPersonFee: 700 };
const FIELDS = Object.keys(DEFAULTS) as (keyof d.BusinessParameters)[];
const only = (k: keyof d.BusinessParameters, v: number) => ({ [k]: v }) as Partial<d.BusinessParameters>;

async function activeMap(): Promise<string> {
  await d.defineTableType('sofa6', { name: '6-person sofa', capacity: 6 });
  const m = await d.createZoneMap({ name: 'Main hall' });
  await d.updateZoneMap(m.id, { zones: [{ id: 'A', name: 'Zone A' }], tables: [{ tableNumber: 1, zoneId: 'A', tableTypeId: 'sofa6', capacity: 6 }] });
  await d.activateZoneMap(m.id);
  return m.id;
}
async function roundOn(zoneMapId: string): Promise<d.Round> {   // a complete Draft round: 2099-06-01, doors 18:00, start 20:00, booking open
  const r = await d.createRound({ name: 'Night' });
  return d.updateRound(r.id, { artist: 'The Band', date: '2099-06-01', doorsOpenAt: '2099-06-01T18:00:00Z', startAt: '2099-06-01T20:00:00Z', bookingOpenAt: '2026-01-01T00:00:00Z', zoneMapId, prices: [{ zoneId: 'A', tableTypeId: 'sofa6', packagePrice: 7200 }] });
}

beforeEach(async () => {
  await resetStore();
  tableAvailability.createRoundTableStatus = async (req) => ({ roundId: req.roundId ?? '', version: 1, tables: [] });
  tableAvailability.getRoundTableStatus = async (roundId) => ({ roundId, version: 1, tables: [] });
});

describe('getBusinessParameters: the defaults until the Manager sets them (UC-07)', () => {
  // class        | input                     | expected
  // never set    | first read                | the defaults of BRULE-02, 04, 05, 09, now stored
  // never set    | second read               | the same document
  // set          | after hold 20             | 20 and the other defaults
  test('never set: first read -> the defaults 15 min / 2 h / 30 min / 600 THB', async () => { assert.deepEqual(await d.getBusinessParameters(), DEFAULTS); });
  test('never set: a second read -> the same document', async () => { await d.getBusinessParameters(); assert.deepEqual(await d.getBusinessParameters(), DEFAULTS); });
  test('set: holdPeriodMinutes 20 -> 20 and the other defaults', async () => { await d.updateBusinessParameters({ holdPeriodMinutes: 20 }); assert.deepEqual(await d.getBusinessParameters(), { ...DEFAULTS, holdPeriodMinutes: 20 }); });
});

describe('updateBusinessParameters: equivalence classes per field (FR-38)', () => {
  // class          | input (the field alone)      | expected
  // minimum        | 0                            | stored, the other fields unchanged (a period of 0 switches it off)
  // below minimum  | -1                           | invalid "must be a non-negative number", nothing stored
  // typical        | 20 / 3 / 45 / 700            | stored
  // not a number   | NaN, Infinity                | invalid, nothing stored
  // non-integer    | 1.5                          | invalid (data-model.md: int) -> TODO: the rule accepts any finite number
  // missing        | the field left out           | unchanged
  // empty patch    | {}                           | the defaults, unchanged
  // all four       | 20, 3, 45, 700               | all stored
  // mixed          | hold 20 with fee -1          | invalid, nothing stored (not even the valid field)
  const cases: { name: string; patch: Partial<d.BusinessParameters>; stored?: d.BusinessParameters }[] = [];
  for (const k of FIELDS) {
    cases.push({ name: `${k} at minimum: 0 -> stored, the other fields unchanged`, patch: only(k, 0), stored: { ...DEFAULTS, [k]: 0 } as d.BusinessParameters });
    cases.push({ name: `${k} below minimum: -1 -> invalid, nothing stored`, patch: only(k, -1) });
    cases.push({ name: `${k} typical: ${TYPICAL[k]} -> stored`, patch: only(k, TYPICAL[k]), stored: { ...DEFAULTS, [k]: TYPICAL[k] } as d.BusinessParameters });
    cases.push({ name: `${k} not a number: NaN -> invalid, nothing stored`, patch: only(k, NaN) });
    cases.push({ name: `${k} not a number: Infinity -> invalid, nothing stored`, patch: only(k, Infinity) });
    cases.push({ name: `${k} missing: the other three set -> unchanged`, patch: Object.fromEntries(FIELDS.filter((f) => f !== k).map((f) => [f, TYPICAL[f]])) as Partial<d.BusinessParameters>, stored: { ...TYPICAL, [k]: DEFAULTS[k] } as d.BusinessParameters });
  }
  cases.push({ name: 'every field missing: {} -> the defaults, unchanged', patch: {}, stored: DEFAULTS });
  cases.push({ name: 'every field: 20, 3, 45, 700 -> all stored', patch: TYPICAL, stored: TYPICAL });
  cases.push({ name: 'mixed: hold 20 with fee -1 -> invalid, nothing stored', patch: { holdPeriodMinutes: 20, extraPersonFee: -1 } });
  for (const c of cases) test(c.name, async () => {
    if (c.stored) { assert.deepEqual(await d.updateBusinessParameters(c.patch), c.stored); assert.deepEqual(await d.getBusinessParameters(), c.stored); }
    else { await refused(d.updateBusinessParameters(c.patch), 'invalid'); assert.deepEqual(await d.getBusinessParameters(), DEFAULTS); }
  });
  for (const k of FIELDS) test(`${k} non-integer: 1.5 -> invalid (data-model.md declares int, the proto carries int32)`, async () => {
    await refused(d.updateBusinessParameters(only(k, 1.5)), 'invalid');
  });
});

describe('the snapshot of a published round (FR-38: a change applies to rounds published afterwards)', () => {
  // class                       | input                                   | expected
  // published before the change | all four changed after publishing       | getRound 15, getRoundPricing 600, the window of a later edit 2 h / 30 min
  // published after the change  | all four changed, then published        | the new values snapshotted
  // Draft                       | all four changed                        | reads the values in force (no snapshot yet): hold 20, fee 700
  // Draft, window                | hours 3, grace 45, then start set       | the window follows the new parameters
  test('published before the change: all four changed -> the round keeps 15 min, 600 THB and a 2 h / 30 min window', async () => {
    const r = await roundOn(await activeMap());
    assert.equal((await d.publishRound(r.id)).parameters?.holdPeriodMinutes, 15);
    await d.updateBusinessParameters(TYPICAL);
    assert.equal((await d.getRound(r.id)).holdPeriodMinutes, 15);
    assert.equal((await d.getRoundPricing(r.id)).extraPersonFee, 600);
    const edited = await d.updateRound(r.id, { name: 'Night 2' });   // a Published round derives its window from the snapshot
    assert.deepEqual([edited.checkInWindow?.opensAt, edited.checkInWindow?.graceEndsAt], ['2099-06-01T18:00:00.000Z', '2099-06-01T20:30:00.000Z']);
    assert.deepEqual(await d.getCheckInWindow(r.id), { roundId: r.id, opensAt: '2099-06-01T18:00:00.000Z', startAt: '2099-06-01T20:00:00.000Z', graceEndsAt: '2099-06-01T20:30:00.000Z' });
  });
  test('published after the change: all four changed, then published -> the new values are the snapshot', async () => {
    const r = await roundOn(await activeMap());
    await d.updateBusinessParameters(TYPICAL);
    const p = await d.publishRound(r.id);
    assert.deepEqual(p.parameters, TYPICAL);
    assert.deepEqual([p.checkInWindow?.opensAt, p.checkInWindow?.graceEndsAt], ['2099-06-01T17:00:00.000Z', '2099-06-01T20:45:00.000Z']);
    assert.equal((await d.getRound(r.id)).holdPeriodMinutes, 20);
    assert.equal((await d.getRoundPricing(r.id)).extraPersonFee, 700);
  });
  test('Draft: all four changed -> the round reads the values in force, hold 20 and fee 700', async () => {
    const r = await roundOn(await activeMap());
    await d.updateBusinessParameters(TYPICAL);
    assert.equal((await d.getRound(r.id)).parameters, null);
    assert.equal((await d.getRound(r.id)).holdPeriodMinutes, 20);
    assert.equal((await d.getRoundPricing(r.id)).extraPersonFee, 700);
  });
  test('Draft, window: hours 3 and grace 45, then the start set -> opens 3 h before, grace ends 45 min after (BRULE-04, 05)', async () => {
    await d.updateBusinessParameters({ checkInWindowHours: 3, gracePeriodMinutes: 45 });
    const r = await d.updateRound((await d.createRound()).id, { startAt: '2099-06-01T20:00:00Z' });
    assert.deepEqual(r.checkInWindow, { opensAt: '2099-06-01T17:00:00.000Z', startAt: '2099-06-01T20:00:00.000Z', graceEndsAt: '2099-06-01T20:45:00.000Z' });
  });
});
