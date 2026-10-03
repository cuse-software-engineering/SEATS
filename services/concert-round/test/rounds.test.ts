// Unit tests of the Concert Round Service domain: rounds (UC-03) and the customer's list (UC-01). The Table
// Availability client is replaced by stubs on the client object itself (the port bound by wire() delegates to it).
// Test design: equivalence classes with boundary values per operation (the table in the header comment of each
// describe), the state-transition matrix of a round (Draft, Published × booking open × Confirmed bookings) against
// (update, validate, publish, discard) with the restriction of UC-03 AF-3, and the decision table of publishRound;
// one test per row.
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain/index.js';
import { tableAvailability } from '../src/infrastructure/clients.js';
import { resetStore, wire } from '../src/infrastructure/index.js';
import type { CreateRoundTableStatusRequest } from '@seats/proto/gen/seats/tableavailability/v1/CreateRoundTableStatusRequest';
import type { TableStatus__Output } from '@seats/proto/gen/seats/tableavailability/v1/TableStatus';
wire();   // the in-memory repositories and the client object behind the domain's ports, once per process

const refused = (p: Promise<unknown>, kind: d.DomainError['kind'], check: (e: d.DomainError) => boolean = () => true) =>
  assert.rejects(p, (e: unknown) => e instanceof d.DomainError && e.kind === kind && check(e));
const unavailable = (p: Promise<unknown>, system: string) => assert.rejects(p, (e: unknown) => e instanceof d.InfrastructureError && e.system === system);
const PAST = '2026-01-01T00:00:00.000Z';
const FUTURE = '2099-01-01T00:00:00.000Z';   // a booking-open time that has not passed
const D = '2099-06-01';                      // the fixed date of the schedule tables (the overlap check compares times, not dates)
const NEXT = '2099-06-02';
const at = (date: string, hhmm: string) => `${date}T${hhmm}:00Z`;
const day = (offset: number) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);   // a future date; validateRound refuses overlaps
const PRICES: d.PackagePrice[] = [{ zoneId: 'A', tableTypeId: 'sofa6', packagePrice: 7200 }, { zoneId: 'A', tableTypeId: 'round2', packagePrice: 2400 }];
const DEFAULTS: d.BusinessParameters = { holdPeriodMinutes: 15, checkInWindowHours: 2, gracePeriodMinutes: 30, extraPersonFee: 600 };
const REQUIRED = 'date, doors-open time, start time and booking-open time are required';
const DOORS = 'the doors-open time must be before the start time';
const OPEN = 'the booking-open time must be before the start time';
const NO_ROUND2 = 'no package price for 2-person round table in Zone A';
const OVERLAPS = 'overlaps the published round "Other"';
const status = (n: number, s: string): TableStatus__Output => ({ tableNumber: n, status: s, bookingId: s === 'AVAILABLE' ? '' : `b${n}`, holdEndsAt: '' });
let created: CreateRoundTableStatusRequest[] = [];
let removed: string[] = [];
let tables: TableStatus__Output[] = [];   // what the Table Availability Service answers for any round
let counts: Record<string, { available: number; forSale: number }> = {};

const defineTypes = async () => { await d.defineTableType('sofa6', { name: '6-person sofa', capacity: 6 }); await d.defineTableType('round2', { name: '2-person round table', capacity: 2 }); };
/** Zone A with tables 1 (sofa6), 2 and 3 (round2); Draft unless activated. */
async function mapIn(state: d.ZoneMapStatus): Promise<string> {
  await defineTypes();
  const m = await d.createZoneMap({ name: 'Main hall' });
  await d.updateZoneMap(m.id, { zones: [{ id: 'A', name: 'Zone A' }], tables: [{ tableNumber: 1, zoneId: 'A', tableTypeId: 'sofa6', capacity: 6 }, { tableNumber: 2, zoneId: 'A', tableTypeId: 'round2', capacity: 2 }, { tableNumber: 3, zoneId: 'A', tableTypeId: 'round2', capacity: 2 }] });
  if (state === 'Active') await d.activateZoneMap(m.id);
  return m.id;
}
const activeMap = () => mapIn('Active');
const fullRound = (zoneMapId: string, dayOffset: number, bookingOpenAt = PAST): d.RoundPatch => ({
  artist: 'The Band', date: day(dayOffset), doorsOpenAt: `${day(dayOffset)}T18:00:00Z`, startAt: `${day(dayOffset)}T20:00:00Z`, bookingOpenAt, zoneMapId,
  tablesNotForSale: [3], prices: [{ zoneId: 'A', tableTypeId: 'sofa6', packagePrice: 7200 }, { zoneId: 'A', tableTypeId: 'round2', packagePrice: 2400 }],
});
const schedule = (date: string, doors: string, start: string, bookingOpenAt = PAST): d.RoundPatch => ({ date, doorsOpenAt: at(date, doors), startAt: at(date, start), bookingOpenAt });
/** A complete round on the map: D, doors 18:00, start 20:00 (grace ends 20:30), booking open, every table for sale, priced. */
const roundOn = (zoneMapId: string, patch: d.RoundPatch = {}): d.RoundPatch => ({ artist: 'The Band', ...schedule(D, '18:00', '20:00'), zoneMapId, tablesNotForSale: [], prices: PRICES, ...patch });
const draft = async (patch: d.RoundPatch, name?: string) => d.updateRound((await d.createRound({ name })).id, patch);
const published = async (patch: d.RoundPatch, name?: string) => d.publishRound((await draft(patch, name)).id);

beforeEach(async () => {
  await resetStore();
  created = []; removed = []; tables = []; counts = {};
  tableAvailability.createRoundTableStatus = async (req) => { created.push(req); return { roundId: req.roundId ?? '', version: 1, tables: [] }; };
  tableAvailability.getRoundTableStatus = async (roundId) => ({ roundId, version: 1, tables });
  tableAvailability.removeRoundTableStatus = async (roundId) => { removed.push(roundId); return { removed: true }; };
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
  test('no name given: -> "Untitled round", artist blank', async () => { const r = await d.createRound(); assert.deepEqual([r.name, r.artist, r.tablesNotForSale], ['Untitled round', '', []]); });
});

describe('validateRound: the schedule (UC-03 S-1 step 1, FR-75; EF-1 "times out of order")', () => {
  // The round is complete on an Active map (D, doors 18:00, start 20:00, booking open in the past) but for the field under test.
  // class                          | input                              | expected
  // doors before start             | 18:00 < 20:00                      | valid
  // doors a minute before start    | 19:59                              | valid
  // doors equal to start           | 20:00 = 20:00                      | invalid: doors-open before the start
  // doors after start              | 21:00                              | invalid: doors-open before the start
  // doors missing                  | ''                                 | invalid: required
  // doors malformed                | 'tonight'                          | invalid
  // start missing                  | ''                                 | invalid: required
  // start malformed                | 'late'                             | invalid -> TODO: updateRound throws RangeError
  // booking open before doors      | the day before                     | valid
  // booking open equal to doors    | 18:00 = 18:00                      | valid (the rule: before the start)
  // booking open after doors       | 19:00, before the start            | valid
  // booking open a minute before   | 19:59                              | valid
  // booking open equal to start    | 20:00 = 20:00                      | invalid: booking-open before the start
  // booking open after start       | 21:00                              | invalid: booking-open before the start
  // booking open missing           | ''                                 | invalid: required
  // booking open malformed         | 'soon'                             | invalid
  // doors and booking open at start| 20:00, 20:00                       | both problems, once each
  // date missing                   | ''                                 | invalid: required
  // date malformed                 | '2099-13-45'                       | invalid (model: YYYY-MM-DD) -> TODO: accepted
  // everything missing             | '', '', '', ''                     | the one "required" problem, not one per field
  // name blank                     | ''                                 | valid (S-1 names no check on the concert details)
  // artist blank                   | ''                                 | valid
  const cases: { name: string; patch: d.RoundPatch; problems: string[] | 'invalid' }[] = [
    { name: 'doors before start: 18:00 < 20:00 -> valid', patch: {}, problems: [] },
    { name: 'doors a minute before start: 19:59 -> valid', patch: { doorsOpenAt: at(D, '19:59') }, problems: [] },
    { name: 'doors equal to start: 20:00 = 20:00 -> invalid, doors-open before the start', patch: { doorsOpenAt: at(D, '20:00') }, problems: [DOORS] },
    { name: 'doors after start: 21:00 > 20:00 -> invalid, doors-open before the start', patch: { doorsOpenAt: at(D, '21:00') }, problems: [DOORS] },
    { name: 'doors missing: "" -> invalid, required', patch: { doorsOpenAt: '' }, problems: [REQUIRED] },
    { name: 'doors malformed: "tonight" -> invalid', patch: { doorsOpenAt: 'tonight' }, problems: 'invalid' },
    { name: 'start missing: "" -> invalid, required', patch: { startAt: '' }, problems: [REQUIRED] },
    { name: 'booking open before doors: the day before -> valid', patch: { bookingOpenAt: at('2099-05-31', '18:00') }, problems: [] },
    { name: 'booking open equal to doors: 18:00 = 18:00 -> valid (the rule: before the start)', patch: { bookingOpenAt: at(D, '18:00') }, problems: [] },
    { name: 'booking open after doors, before start: 19:00 -> valid', patch: { bookingOpenAt: at(D, '19:00') }, problems: [] },
    { name: 'booking open a minute before start: 19:59 -> valid', patch: { bookingOpenAt: at(D, '19:59') }, problems: [] },
    { name: 'booking open equal to start: 20:00 = 20:00 -> invalid, booking-open before the start', patch: { bookingOpenAt: at(D, '20:00') }, problems: [OPEN] },
    { name: 'booking open after start: 21:00 -> invalid, booking-open before the start', patch: { bookingOpenAt: at(D, '21:00') }, problems: [OPEN] },
    { name: 'booking open missing: "" -> invalid, required', patch: { bookingOpenAt: '' }, problems: [REQUIRED] },
    { name: 'booking open malformed: "soon" -> invalid', patch: { bookingOpenAt: 'soon' }, problems: 'invalid' },
    { name: 'doors and booking open both at start: 20:00, 20:00 -> both problems, once each', patch: { doorsOpenAt: at(D, '20:00'), bookingOpenAt: at(D, '20:00') }, problems: [DOORS, OPEN] },
    { name: 'date missing: "" -> invalid, required', patch: { date: '' }, problems: [REQUIRED] },
    { name: 'everything missing: "", "", "", "" -> the one "required" problem, not one per field', patch: { date: '', doorsOpenAt: '', startAt: '', bookingOpenAt: '' }, problems: [REQUIRED] },
    { name: 'name blank: "" -> valid (S-1 names no check on the concert details)', patch: { name: '' }, problems: [] },
    { name: 'artist blank: "" -> valid (S-1 names no check on the concert details)', patch: { artist: '' }, problems: [] },
  ];
  for (const c of cases) test(c.name, async () => {
    const r = await draft(roundOn(await activeMap(), c.patch));
    const v = await d.validateRound(r.id);
    if (c.problems === 'invalid') assert.equal(v.valid, false); else assert.deepEqual(v, { valid: c.problems.length === 0, problems: c.problems });
  });
  test('start malformed: "late" -> invalid (EF-1: the field is marked)', async () => {
    const r = await draft(roundOn(await activeMap(), { startAt: 'late' }));
    assert.equal((await d.validateRound(r.id)).valid, false);
  });
  test('date malformed: "2099-13-45" -> invalid (data-model.md: YYYY-MM-DD)', async () => {
    const r = await draft(roundOn(await activeMap(), { date: '2099-13-45' }));
    assert.equal((await d.validateRound(r.id)).valid, false);
  });
});

describe('validateRound: the package prices (UC-03 S-1 step 2, BRULE-08)', () => {
  // Zone A holds table 1 (sofa6) and tables 2, 3 (round2); every table for sale unless the row says otherwise.
  // class                           | input                                       | expected
  // complete                        | sofa6@A 7200, round2@A 2400                 | valid
  // one zone×type missing           | round2@A left out                           | invalid: that type in that zone named
  // none                            | []                                          | invalid: each zone×type for sale, once
  // a price of 0                    | round2@A 0                                  | valid (a price is set; S-1 asks for none above 0)
  // negative                        | round2@A -1                                 | invalid (a THB amount) -> TODO: accepted
  // a price for nothing on the map  | vip@B 9999 added                            | valid, ignored
  // none, nothing for sale          | [] with tables 1, 2, 3 not for sale         | valid
  // missing where not for sale      | round2@A left out, tables 2 and 3 not for sale | valid
  const cases: { name: string; prices: d.PackagePrice[]; tablesNotForSale?: number[]; problems: string[] }[] = [
    { name: 'complete: sofa6@A 7200, round2@A 2400 -> valid', prices: PRICES, problems: [] },
    { name: 'one zone×type missing: round2@A left out -> invalid, that type in that zone named', prices: [PRICES[0]], problems: [NO_ROUND2] },
    { name: 'none: [] -> invalid, each zone×type for sale named once', prices: [], problems: ['no package price for 6-person sofa in Zone A', NO_ROUND2] },
    { name: 'a price of 0: round2@A 0 -> valid (a price is set; S-1 asks for none above 0)', prices: [PRICES[0], { ...PRICES[1], packagePrice: 0 }], problems: [] },
    { name: 'a price for nothing on the map: vip@B 9999 added -> valid, ignored', prices: [...PRICES, { zoneId: 'B', tableTypeId: 'vip', packagePrice: 9999 }], problems: [] },
    { name: 'none, nothing for sale: [] with tables 1, 2, 3 not for sale -> valid', prices: [], tablesNotForSale: [1, 2, 3], problems: [] },
    { name: 'missing where not for sale: round2@A left out, tables 2 and 3 not for sale -> valid', prices: [PRICES[0]], tablesNotForSale: [2, 3], problems: [] },
  ];
  for (const c of cases) test(c.name, async () => {
    const r = await draft(roundOn(await activeMap(), { prices: c.prices, tablesNotForSale: c.tablesNotForSale ?? [] }));
    assert.deepEqual(await d.validateRound(r.id), { valid: c.problems.length === 0, problems: c.problems });
  });
  test('negative: round2@A -1 -> invalid (BRULE-08: a package price is a THB amount)', async () => {
    const r = await draft(roundOn(await activeMap(), { prices: [PRICES[0], { ...PRICES[1], packagePrice: -1 }] }));
    assert.equal((await d.validateRound(r.id)).valid, false);
  });
});

describe('validateRound and publishRound: the tables not for sale (UC-03 step 8, the table status handed over at publish)', () => {
  // class            | input         | expected (validation; forSale per table; the table status handed to the Table Availability Service)
  // empty            | []            | valid; every table for sale
  // one              | [3]           | valid; table 3 not for sale
  // not on the map   | [99]          | valid; ignored, every map table for sale, 99 not handed over
  // duplicates       | [3, 3]        | valid; table 3 not for sale, handed over once
  // all              | [1, 2, 3]     | valid without any price; nothing for sale
  const cases: { name: string; tablesNotForSale: number[]; prices?: d.PackagePrice[]; forSale: [number, boolean][] }[] = [
    { name: 'empty: [] -> valid, every table for sale', tablesNotForSale: [], forSale: [[1, true], [2, true], [3, true]] },
    { name: 'one: [3] -> valid, table 3 not for sale', tablesNotForSale: [3], forSale: [[1, true], [2, true], [3, false]] },
    { name: 'not on the map: [99] -> valid, ignored, every map table for sale and 99 not handed over', tablesNotForSale: [99], forSale: [[1, true], [2, true], [3, true]] },
    { name: 'duplicates: [3, 3] -> valid, table 3 not for sale and handed over once', tablesNotForSale: [3, 3], forSale: [[1, true], [2, true], [3, false]] },
    { name: 'all: [1, 2, 3] without any price -> valid, nothing for sale', tablesNotForSale: [1, 2, 3], prices: [], forSale: [[1, false], [2, false], [3, false]] },
  ];
  for (const c of cases) test(c.name, async () => {
    const r = await draft(roundOn(await activeMap(), { tablesNotForSale: c.tablesNotForSale, ...(c.prices ? { prices: c.prices } : {}) }));
    assert.deepEqual(await d.validateRound(r.id), { valid: true, problems: [] });
    assert.deepEqual((await d.getRoundTables(r.id)).map((t) => [t.tableNumber, t.forSale]), c.forSale);
    await d.publishRound(r.id);
    assert.deepEqual(created, [{ roundId: r.id, tables: c.forSale.map(([tableNumber, forSale]) => ({ tableNumber, forSale })) }]);
  });
});

describe('validateRound: overlap with another round (UC-03 S-1 step 3, FR-75)', () => {
  // The rule: the windows [doors-open, end of grace] overlap when mine[0] < theirs[1] && theirs[0] < mine[1]. "Other" is
  // Published on D 18:00–20:00, its grace ends 20:30 (BRULE-05); mine ends 30 minutes after its start too.
  // class                                | mine (date doors–start)   | other     | expected
  // disjoint, the next day               | NEXT 18:00–20:00          | Published | valid
  // touching: theirs ends as mine opens  | D 20:30–22:30             | Published | valid (20:30 is not < 20:30)
  // touching: mine ends as theirs opens  | D 15:30–17:30             | Published | valid (grace ends 18:00, not > 18:00)
  // overlapping by a minute, after       | D 20:29–22:29             | Published | invalid: overlaps "Other"
  // overlapping by a minute, before      | D 15:31–17:31             | Published | invalid (grace ends 18:01)
  // identical window                     | D 18:00–20:00             | Published | invalid
  // contained                            | D 18:30–19:30             | Published | invalid
  // containing                           | D 17:00–21:00             | Published | invalid
  // the other is a Draft                 | D 18:00–20:00             | Draft     | valid (a Draft is not in the check)
  // my own earlier version               | the Published round itself, re-validated | —  | valid (a round never overlaps itself)
  // my own version, times moved          | the Published round, doors and start moved an hour | — | valid
  // two Published rounds overlapped      | D 19:00–21:00 over "Other" and "Later" | Published | invalid: one problem per round
  const cases: { name: string; date: string; doors: string; start: string; other: d.RoundStatus; valid: boolean }[] = [
    { name: 'disjoint, the next day: NEXT 18:00–20:00 -> valid', date: NEXT, doors: '18:00', start: '20:00', other: 'Published', valid: true },
    { name: 'touching, theirs ends as mine opens: D 20:30–22:30 -> valid (end-to-start is not an overlap)', date: D, doors: '20:30', start: '22:30', other: 'Published', valid: true },
    { name: 'touching, mine ends as theirs opens: D 15:30–17:30, grace ends 18:00 -> valid', date: D, doors: '15:30', start: '17:30', other: 'Published', valid: true },
    { name: 'overlapping by a minute, after: D 20:29–22:29 -> invalid, overlaps "Other"', date: D, doors: '20:29', start: '22:29', other: 'Published', valid: false },
    { name: 'overlapping by a minute, before: D 15:31–17:31, grace ends 18:01 -> invalid', date: D, doors: '15:31', start: '17:31', other: 'Published', valid: false },
    { name: 'identical window: D 18:00–20:00 -> invalid', date: D, doors: '18:00', start: '20:00', other: 'Published', valid: false },
    { name: 'contained: D 18:30–19:30 -> invalid', date: D, doors: '18:30', start: '19:30', other: 'Published', valid: false },
    { name: 'containing: D 17:00–21:00 -> invalid', date: D, doors: '17:00', start: '21:00', other: 'Published', valid: false },
    { name: 'the other is a Draft: identical window -> valid (a Draft round is not in the check)', date: D, doors: '18:00', start: '20:00', other: 'Draft', valid: true },
  ];
  for (const c of cases) test(c.name, async () => {
    const map = await activeMap();
    const other = await draft(roundOn(map), 'Other');
    if (c.other === 'Published') await d.publishRound(other.id);
    const r = await draft(roundOn(map, schedule(c.date, c.doors, c.start)));
    assert.deepEqual(await d.validateRound(r.id), { valid: c.valid, problems: c.valid ? [] : [OVERLAPS] });
  });
  test('my own earlier version: the Published round re-validated -> valid (a round never overlaps itself)', async () => {
    const r = await published(roundOn(await activeMap()), 'Other');
    assert.deepEqual(await d.validateRound(r.id), { valid: true, problems: [] });
  });
  test('my own version, times moved: the Published round moved an hour, re-validated -> valid', async () => {
    const r = await published(roundOn(await activeMap()), 'Other');
    await d.updateRound(r.id, { doorsOpenAt: at(D, '19:00'), startAt: at(D, '21:00') });
    assert.deepEqual(await d.validateRound(r.id), { valid: true, problems: [] });
  });
  test('two Published rounds overlapped: D 19:00–21:00 over "Other" and "Later" -> one problem per round', async () => {
    const map = await activeMap();
    await published(roundOn(map), 'Other');
    await published(roundOn(map, schedule(D, '20:30', '22:30')), 'Later');
    const r = await draft(roundOn(map, schedule(D, '19:00', '21:00')));
    assert.deepEqual(await d.validateRound(r.id), { valid: false, problems: [OVERLAPS, 'overlaps the published round "Later"'] });
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
  test('the start cleared: "" -> the check-in window is null again', async () => {
    const r = await draft({ startAt: '2026-12-24T20:00:00Z' });
    assert.equal((await d.updateRound(r.id, { startAt: '' })).checkInWindow, null);
  });
});

type State = 'Draft' | 'NotOpen' | 'Open0' | 'OpenHeld' | 'Open1' | 'Open2';
const STATUS: Record<State, TableStatus__Output[]> = { Draft: [], NotOpen: [], Open0: [status(1, 'AVAILABLE')], OpenHeld: [status(1, 'HELD')], Open1: [status(1, 'BOOKED'), status(2, 'AVAILABLE')], Open2: [status(1, 'BOOKED'), status(2, 'OCCUPIED')] };
const CONFIRMED: Record<State, number> = { Draft: 0, NotOpen: 0, Open0: 0, OpenHeld: 0, Open1: 1, Open2: 2 };
/** A complete round on the map in the state: Draft, or Published with the booking-open time in the future (NotOpen) or
 *  in the past (Open…) and the table status the stub answers (0, a HELD, 1 or 2 Confirmed tables). */
async function roundIn(state: State, map: string): Promise<d.Round> {
  tables = STATUS[state];
  const patch = roundOn(map, state === 'NotOpen' ? { bookingOpenAt: FUTURE } : {});
  return state === 'Draft' ? draft(patch) : published(patch);
}

describe('state transitions of a round: (Draft, Published × booking open × Confirmed) × (update, validate, publish, discard)', () => {
  // state \ operation            | update (UC-03 AF-1, AF-3; BRULE-07)                                                      | validate                    | publish                                   | discard
  // Draft                        | any field                                                                                | result                      | valid -> Published; invalid -> 'invalid'  | removed
  // Published, not yet open      | any field (AF-3 step 2); a changed map or sale list rebuilds the table status            | result (never itself)       | idempotent, no second table status (EF-2) | 'conflict'
  // Published, open, 0 Confirmed | name, artist, date, doors, start; map, sale list, prices, booking-open -> 'conflict' {0}   | result                      | idempotent                                | 'conflict'
  // Published, open, Confirmed   | name, artist; date, doors, start -> 'conflict' {confirmedBookings: n}                     | result                      | idempotent                                | 'conflict'
  // unknown id                   | 'not_found'                                                                              | 'not_found'                 | 'not_found'                               | 'not_found'
  const otherMap = async (): Promise<string> => { const m = await d.createZoneMap({ name: 'Garden' }); await d.updateZoneMap(m.id, { zones: [{ id: 'A', name: 'Zone A' }], tables: [{ tableNumber: 7, zoneId: 'A', tableTypeId: 'sofa6', capacity: 6 }] }); await d.activateZoneMap(m.id); return m.id; };
  const update: { name: string; state: State; patch: d.RoundPatch | ((map: string) => Promise<d.RoundPatch>); expected: 'taken' | 'conflict'; fixed?: string[]; rebuilt?: { tableNumber: number; forSale: boolean }[] }[] = [
    { name: 'Draft × update: every field -> taken', state: 'Draft', patch: { name: 'Night', artist: 'B', ...schedule(NEXT, '19:00', '21:00', FUTURE), tablesNotForSale: [2], prices: [PRICES[0]] }, expected: 'taken' },
    { name: 'Draft × update: zoneMapId "" -> taken (any field while Draft)', state: 'Draft', patch: { zoneMapId: '' }, expected: 'taken' },
    { name: 'Published, not yet open × update: artist, date, times, booking-open -> taken (AF-3 step 2), the table status untouched', state: 'NotOpen', patch: { artist: 'B', ...schedule(NEXT, '19:00', '21:00', FUTURE) }, expected: 'taken' },
    { name: 'Published, not yet open × update: prices -> taken, the table status untouched', state: 'NotOpen', patch: { prices: [{ ...PRICES[0], packagePrice: 8000 }, PRICES[1]] }, expected: 'taken' },
    { name: 'Published, not yet open × update: tablesNotForSale [2] -> taken, the table status removed and created again with 2 not for sale', state: 'NotOpen', patch: { tablesNotForSale: [2] }, expected: 'taken', rebuilt: [{ tableNumber: 1, forSale: true }, { tableNumber: 2, forSale: false }, { tableNumber: 3, forSale: true }] },
    { name: 'Published, not yet open × update: the same tablesNotForSale [] -> taken, the table status untouched', state: 'NotOpen', patch: { tablesNotForSale: [] }, expected: 'taken' },
    { name: 'Published, not yet open × update: zoneMapId of another Active map -> taken, the table status rebuilt from that map', state: 'NotOpen', patch: async () => ({ zoneMapId: await otherMap() }), expected: 'taken', rebuilt: [{ tableNumber: 7, forSale: true }] },
    { name: 'Published, not yet open × update: booking-open moved into the past -> taken, then the round is open', state: 'NotOpen', patch: { bookingOpenAt: PAST }, expected: 'taken' },
    { name: 'Published, open, 0 Confirmed × update: name, artist, date, doors, start -> taken, confirmedBookings 0', state: 'Open0', patch: { name: 'Night 2', artist: 'B', date: NEXT, doorsOpenAt: at(NEXT, '19:00'), startAt: at(NEXT, '21:00') }, expected: 'taken' },
    { name: 'Published, open, 0 Confirmed × update: zoneMapId -> conflict, the map is fixed (BRULE-07, FR-35)', state: 'Open0', patch: { zoneMapId: 'another' }, expected: 'conflict', fixed: ['zoneMapId'] },
    { name: 'Published, open, 0 Confirmed × update: tablesNotForSale -> conflict, the tables for sale are fixed', state: 'Open0', patch: { tablesNotForSale: [2] }, expected: 'conflict', fixed: ['tablesNotForSale'] },
    { name: 'Published, open, 0 Confirmed × update: prices -> conflict, the prices are fixed', state: 'Open0', patch: { prices: [] }, expected: 'conflict', fixed: ['prices'] },
    { name: 'Published, open, 0 Confirmed × update: bookingOpenAt -> conflict, a booking-open time that has passed is fixed', state: 'Open0', patch: { bookingOpenAt: FUTURE }, expected: 'conflict', fixed: ['bookingOpenAt'] },
    { name: 'Published, open, 0 Confirmed × update: name with prices -> conflict naming prices, nothing applied', state: 'Open0', patch: { name: 'Night 2', prices: [] }, expected: 'conflict', fixed: ['prices'] },
    { name: 'Published, open, a HELD table × update: date -> taken (a hold is not a Confirmed booking)', state: 'OpenHeld', patch: { date: NEXT, doorsOpenAt: at(NEXT, '18:00'), startAt: at(NEXT, '20:00') }, expected: 'taken' },
    { name: 'Published, open, 1 Confirmed × update: name, artist -> taken, confirmedBookings 1', state: 'Open1', patch: { name: 'Night 2', artist: 'B' }, expected: 'taken' },
    { name: 'Published, open, 1 Confirmed × update: date -> conflict {confirmedBookings: 1}', state: 'Open1', patch: { date: NEXT }, expected: 'conflict', fixed: ['date'] },
    { name: 'Published, open, 1 Confirmed × update: doorsOpenAt -> conflict', state: 'Open1', patch: { doorsOpenAt: at(D, '17:00') }, expected: 'conflict', fixed: ['doorsOpenAt'] },
    { name: 'Published, open, 1 Confirmed × update: startAt -> conflict', state: 'Open1', patch: { startAt: at(D, '21:00') }, expected: 'conflict', fixed: ['startAt'] },
    { name: 'Published, open, 1 Confirmed × update: artist with date and prices -> conflict naming date, prices', state: 'Open1', patch: { artist: 'B', date: NEXT, prices: [] }, expected: 'conflict', fixed: ['date', 'prices'] },
    { name: 'Published, open, BOOKED and OCCUPIED × update: name -> taken, confirmedBookings 2 (checked in counts)', state: 'Open2', patch: { name: 'Night 2' }, expected: 'taken' },
    { name: 'Published, open, 2 Confirmed × update: startAt -> conflict {confirmedBookings: 2}', state: 'Open2', patch: { startAt: at(D, '21:00') }, expected: 'conflict', fixed: ['startAt'] },
  ];
  for (const c of update) test(c.name, async () => {
    const map = await activeMap();
    const r = await roundIn(c.state, map);
    const patch = typeof c.patch === 'function' ? await c.patch(map) : c.patch;
    const before = await d.getRound(r.id);
    const n = created.length;
    if (c.expected === 'conflict') {
      await refused(d.updateRound(r.id, patch), 'conflict', (e) => e.message.endsWith((c.fixed ?? []).join(', ')) && JSON.stringify(e.details) === JSON.stringify({ confirmedBookings: CONFIRMED[c.state] }));
      assert.deepEqual(await d.getRound(r.id), before);
      assert.deepEqual([removed, created.length], [[], n]);
    } else {
      const after = await d.updateRound(r.id, patch);
      for (const k of Object.keys(patch) as (keyof d.RoundPatch)[]) assert.deepEqual(after[k], patch[k]);
      assert.equal(after.confirmedBookings, c.state === 'Draft' ? undefined : CONFIRMED[c.state]);
      assert.equal(after.status, before.status);
      assert.deepEqual([removed, created.length], c.rebuilt ? [[r.id], n + 1] : [[], n]);
      if (c.rebuilt) assert.deepEqual(created[n], { roundId: r.id, tables: c.rebuilt });
    }
  });
  test('Published × update: the Table Availability Service does not answer -> InfrastructureError naming it, the round unchanged', async () => {
    const r = await roundIn('Open0', await activeMap());
    const before = await d.getRound(r.id);
    tableAvailability.getRoundTableStatus = async () => { throw new d.InfrastructureError('the Table Availability Service', 'the Table Availability Service did not answer: UNAVAILABLE'); };
    await unavailable(d.updateRound(r.id, { name: 'x' }), 'the Table Availability Service');
    assert.deepEqual(await d.getRound(r.id), before);
  });
  const ops: { name: string; state: State; op: 'validate' | 'publish' | 'discard'; expected: 'valid' | 'published' | 'removed' | 'conflict' }[] = [
    { name: 'Draft × validate: complete -> valid', state: 'Draft', op: 'validate', expected: 'valid' },
    { name: 'Draft × publish: valid -> Published, one table status', state: 'Draft', op: 'publish', expected: 'published' },
    { name: 'Draft × discard: -> removed, then not_found', state: 'Draft', op: 'discard', expected: 'removed' },
    { name: 'Published, not yet open × validate: -> valid (a round never overlaps itself)', state: 'NotOpen', op: 'validate', expected: 'valid' },
    { name: 'Published, not yet open × publish: again -> Published, no second table status (EF-2)', state: 'NotOpen', op: 'publish', expected: 'published' },
    { name: 'Published, not yet open × discard: -> conflict, the round kept', state: 'NotOpen', op: 'discard', expected: 'conflict' },
    { name: 'Published, open, 0 Confirmed × validate: -> valid', state: 'Open0', op: 'validate', expected: 'valid' },
    { name: 'Published, open, 0 Confirmed × publish: again -> idempotent', state: 'Open0', op: 'publish', expected: 'published' },
    { name: 'Published, open, 0 Confirmed × discard: -> conflict', state: 'Open0', op: 'discard', expected: 'conflict' },
    { name: 'Published, open, 1 Confirmed × validate: -> valid', state: 'Open1', op: 'validate', expected: 'valid' },
    { name: 'Published, open, 1 Confirmed × publish: again -> idempotent', state: 'Open1', op: 'publish', expected: 'published' },
    { name: 'Published, open, 1 Confirmed × discard: -> conflict', state: 'Open1', op: 'discard', expected: 'conflict' },
  ];
  for (const c of ops) test(c.name, async () => {
    const r = await roundIn(c.state, await activeMap());
    const n = created.length;
    switch (c.op) {
      case 'validate': assert.deepEqual(await d.validateRound(r.id), { valid: true, problems: [] }); break;
      case 'publish': assert.equal((await d.publishRound(r.id)).status, 'Published'); assert.equal(created.length, c.state === 'Draft' ? n + 1 : n); break;
      case 'discard':
        if (c.expected === 'conflict') { await refused(d.discardDraftRound(r.id), 'conflict'); assert.equal((await d.getRound(r.id)).status, 'Published'); }
        else { assert.deepEqual(await d.discardDraftRound(r.id), { removed: true }); await refused(d.getRound(r.id), 'not_found'); }
    }
  });
  const unknown: { name: string; run: () => Promise<unknown> }[] = [
    { name: 'unknown id × update: -> not_found', run: () => d.updateRound('nope', { name: 'x' }) },
    { name: 'unknown id × validate: -> not_found', run: () => d.validateRound('nope') },
    { name: 'unknown id × publish: -> not_found', run: () => d.publishRound('nope') },
    { name: 'unknown id × discard: -> not_found', run: () => d.discardDraftRound('nope') },
    { name: 'unknown id × getRound: -> not_found', run: () => d.getRound('nope') },
    { name: 'unknown id × getRoundTables: -> not_found', run: () => d.getRoundTables('nope') },
    { name: 'unknown id × getRoundPricing: -> not_found', run: () => d.getRoundPricing('nope') },
    { name: 'unknown id × getCheckInWindow: -> not_found', run: () => d.getCheckInWindow('nope') },
  ];
  for (const c of unknown) test(c.name, () => refused(c.run(), 'not_found'));
});

describe('publishRound', () => {
  test('refuses an invalid round with the problems as details', async () => {
    const r = await d.createRound();
    await assert.rejects(d.publishRound(r.id), (e: unknown) => e instanceof d.DomainError && e.kind === 'invalid' && Array.isArray(e.details) && e.details.length > 0);
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

describe('publishRound: decision table (UC-03 steps 14–15, S-1, EF-1, EF-2)', () => {
  // zone map Active | times valid | prices complete | no overlap | outcome
  // Y               | Y           | Y               | Y          | Published; the parameters snapshotted; one CreateRoundTableStatus
  // N, a Draft map  | Y           | Y               | Y          | invalid "the zone map is not Active"; stays Draft; no call
  // N, no map       | Y           | Y               | Y          | invalid "the round has no zone map"
  // Y               | N           | Y               | Y          | invalid, the schedule problem
  // Y               | Y           | N               | Y          | invalid, the price problem
  // Y               | Y           | Y               | N          | invalid, the overlap problem
  // N, a Draft map  | N           | N               | N          | invalid, every problem in the details, in that order
  // already Published (any)                                      | idempotent: Published, no second call
  // Y               | Y           | Y               | Y, but the Table Availability Service does not answer | InfrastructureError; stays Draft, no snapshot
  const rows: { name: string; map: 'Active' | 'Draft' | 'none'; patch: d.RoundPatch; other?: boolean; problems: string[] }[] = [
    { name: 'map Active, times valid, prices complete, no overlap -> Published, the parameters snapshotted, one table status', map: 'Active', patch: {}, problems: [] },
    { name: 'map Draft, times valid, prices complete, no overlap -> invalid "the zone map is not Active", stays Draft, no table status', map: 'Draft', patch: {}, problems: ['the zone map is not Active'] },
    { name: 'no map, times valid, prices complete, no overlap -> invalid "the round has no zone map"', map: 'none', patch: {}, problems: ['the round has no zone map'] },
    { name: 'map Active, times invalid (doors = start), prices complete, no overlap -> invalid, the schedule problem', map: 'Active', patch: { doorsOpenAt: at(D, '20:00') }, problems: [DOORS] },
    { name: 'map Active, times valid, a price missing, no overlap -> invalid, the price problem', map: 'Active', patch: { prices: [PRICES[0]] }, problems: [NO_ROUND2] },
    { name: 'map Active, times valid, prices complete, overlapping "Other" -> invalid, the overlap problem', map: 'Active', patch: {}, other: true, problems: [OVERLAPS] },
    { name: 'map Draft, times invalid, a price missing, overlapping -> invalid, every problem in the details', map: 'Draft', patch: { doorsOpenAt: at(D, '20:00'), prices: [PRICES[0]] }, other: true, problems: [DOORS, 'the zone map is not Active', NO_ROUND2, OVERLAPS] },
  ];
  for (const c of rows) test(c.name, async () => {
    const active = await activeMap();
    if (c.other) await published(roundOn(active), 'Other');
    const mine = c.map === 'Active' ? active : c.map === 'Draft' ? await mapIn('Draft') : '';
    const r = await draft(roundOn(mine, c.patch));
    const n = created.length;
    if (c.problems.length === 0) {
      const p = await d.publishRound(r.id);
      assert.deepEqual([p.status, p.parameters, created.length, created[n]?.roundId], ['Published', DEFAULTS, n + 1, r.id]);
    } else {
      await refused(d.publishRound(r.id), 'invalid', (e) => JSON.stringify(e.details) === JSON.stringify(c.problems));
      const kept = await d.getRound(r.id);
      assert.deepEqual([kept.status, kept.parameters, created.length], ['Draft', null, n]);
    }
  });
  test('already Published: published again -> Published, no second table status (EF-2 retry)', async () => {
    const r = await published(roundOn(await activeMap()));
    assert.equal((await d.publishRound(r.id)).status, 'Published');
    assert.equal(created.length, 1);
  });
  test('valid but the Table Availability Service does not answer -> InfrastructureError naming it; the round stays Draft without a snapshot', async () => {
    const r = await draft(roundOn(await activeMap()));
    tableAvailability.createRoundTableStatus = async () => { throw new d.InfrastructureError('the Table Availability Service', 'the Table Availability Service did not answer: UNAVAILABLE'); };
    await unavailable(d.publishRound(r.id), 'the Table Availability Service');
    const kept = await d.getRound(r.id);
    assert.deepEqual([kept.status, kept.parameters], ['Draft', null]);
  });
});

describe('discardDraftRound', () => {
  test('removes a Draft and refuses a Published round', async () => {
    const draft = await d.createRound();
    assert.deepEqual(await d.discardDraftRound(draft.id), { removed: true });
    await refused(d.getRound(draft.id), 'not_found');
    const map = await activeMap();
    const r = await d.createRound();
    await d.updateRound(r.id, fullRound(map, 3));
    await d.publishRound(r.id);
    await refused(d.discardDraftRound(r.id), 'conflict');
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

describe('getUpcomingRounds: equivalence classes of the customer\'s list (UC-01 step 3, AF-1, AF-2; FR-03)', () => {
  // class                          | round                                        | expected
  // Published, dated in the past   | 2020-01-01                                   | not listed
  // Published, dated today         | today, booking open, 1 available             | listed, 'open'
  // Published, dated tomorrow      | tomorrow                                     | listed
  // booking open in an hour        | now + 1 h (before the start)                 | 'not yet open', the counts still shown
  // open, no count answered        | absent from the counts                       | 'sold out' with 0 / 0
  // open, none available           | available 0 of 2                             | 'sold out'
  // open, one available            | available 1 of 2                             | 'open'
  test('Published, dated in the past: 2020-01-01 -> not listed', async () => {
    await published(roundOn(await activeMap(), { ...schedule('2020-01-01', '18:00', '20:00', '2019-12-01T00:00:00Z') }));
    assert.deepEqual(await d.getUpcomingRounds(), []);
  });
  test('Published, dated today: booking open, 1 available -> listed as open', async () => {
    const r = await published(roundOn(await activeMap(), schedule(day(0), '18:00', '20:00')));
    counts = { [r.id]: { available: 1, forSale: 3 } };
    assert.deepEqual((await d.getUpcomingRounds()).map((x) => [x.id, x.status, x.availableTables, x.tablesForSale]), [[r.id, 'open', 1, 3]]);
  });
  test('Published, dated tomorrow: -> listed with name, artist, date, start and booking-open time', async () => {
    const r = await published(roundOn(await activeMap(), schedule(day(1), '18:00', '20:00')), 'Night');
    assert.deepEqual(await d.getUpcomingRounds(), [{ id: r.id, name: 'Night', artist: 'The Band', date: day(1), startAt: at(day(1), '20:00'), bookingOpenAt: PAST, status: 'sold out', availableTables: 0, tablesForSale: 0 }]);
  });
  test('booking open in an hour: 2 available -> "not yet open", the counts still shown (AF-1)', async () => {
    const r = await published(roundOn(await activeMap(), schedule(day(2), '18:00', '20:00', new Date(Date.now() + 3600e3).toISOString())));
    counts = { [r.id]: { available: 2, forSale: 3 } };
    assert.deepEqual((await d.getUpcomingRounds()).map((x) => [x.status, x.availableTables, x.tablesForSale]), [['not yet open', 2, 3]]);
  });
  test('open, no count answered: absent from the counts -> "sold out" with 0 / 0', async () => {
    await published(roundOn(await activeMap(), schedule(day(2), '18:00', '20:00')));
    assert.deepEqual((await d.getUpcomingRounds()).map((x) => [x.status, x.availableTables, x.tablesForSale]), [['sold out', 0, 0]]);
  });
  test('open, none available: 0 of 2 -> "sold out" (AF-2)', async () => {
    const r = await published(roundOn(await activeMap(), schedule(day(2), '18:00', '20:00')));
    counts = { [r.id]: { available: 0, forSale: 2 } };
    assert.deepEqual((await d.getUpcomingRounds()).map((x) => x.status), ['sold out']);
  });
});

describe('getRound, getRoundTables and getRoundPricing: the reads of the customer and the Booking Service (UC-01 step 5, FR-05)', () => {
  // class                        | round                                              | expected
  // no map                       | zoneMapId ''                                       | tables []
  // joined                       | map, types and prices                              | zone name, type name, capacity, price, content, forSale
  // unknown zone and type        | a table in zone 'Z' of type 'vip' on a Draft map   | blank names, price null
  // pricing, Draft               | prices set                                         | the prices and the fee in force
  test('no map: zoneMapId "" -> tables []', async () => { const r = await draft({ name: 'x' }); assert.deepEqual(await d.getRoundTables(r.id), []); });
  test('joined: map, types and prices -> zone name, type name, capacity, price, content and forSale per table', async () => {
    const r = await draft(roundOn(await activeMap(), { tablesNotForSale: [3], prices: [{ ...PRICES[0], packageContent: 'one bottle' }, PRICES[1]] }));
    assert.deepEqual(await d.getRoundTables(r.id), [
      { tableNumber: 1, zoneId: 'A', zoneName: 'Zone A', tableTypeId: 'sofa6', tableTypeName: '6-person sofa', capacity: 6, x: 0, y: 0, forSale: true, packagePrice: 7200, packageContent: 'one bottle' },
      { tableNumber: 2, zoneId: 'A', zoneName: 'Zone A', tableTypeId: 'round2', tableTypeName: '2-person round table', capacity: 2, x: 0, y: 0, forSale: true, packagePrice: 2400, packageContent: '' },
      { tableNumber: 3, zoneId: 'A', zoneName: 'Zone A', tableTypeId: 'round2', tableTypeName: '2-person round table', capacity: 2, x: 0, y: 0, forSale: false, packagePrice: 2400, packageContent: '' },
    ]);
  });
  test('unknown zone and type: a table in "Z" of type "vip" on a Draft map -> blank names, price null; validation names the ids', async () => {
    const m = await d.createZoneMap();
    await d.updateZoneMap(m.id, { zones: [], tables: [{ tableNumber: 9, zoneId: 'Z', tableTypeId: 'vip', capacity: 4 }] });
    const r = await draft(roundOn(m.id, { prices: [] }));
    assert.deepEqual((await d.getRoundTables(r.id)).map((t) => [t.zoneName, t.tableTypeName, t.packagePrice, t.packageContent]), [['', '', null, '']]);
    assert.deepEqual((await d.validateRound(r.id)).problems, ['the zone map is not Active', 'no package price for vip in Z']);
  });
  test('pricing, Draft: prices set -> the prices and the extra-person fee in force', async () => {
    const r = await draft(roundOn(await activeMap()));
    assert.deepEqual(await d.getRoundPricing(r.id), { roundId: r.id, prices: PRICES, extraPersonFee: 600 });
  });
});

describe('getCheckInWindow', () => {
  test('needs a start time', async () => {
    const r = await d.createRound();
    await refused(d.getCheckInWindow(r.id), 'conflict');
    await d.updateRound(r.id, { startAt: '2026-12-24T20:00:00Z' });
    assert.equal((await d.getCheckInWindow(r.id)).roundId, r.id);
    await refused(d.updateRound('nope', {}), 'not_found');
  });
  test('with a start: 20:00 -> opens 2 h before, grace ends 30 min after (BRULE-04, BRULE-05)', async () => {
    const r = await draft({ startAt: at(D, '20:00') });
    assert.deepEqual(await d.getCheckInWindow(r.id), { roundId: r.id, opensAt: '2099-06-01T18:00:00.000Z', startAt: '2099-06-01T20:00:00.000Z', graceEndsAt: '2099-06-01T20:30:00.000Z' });
  });
});
