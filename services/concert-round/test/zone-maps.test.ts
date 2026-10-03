// Unit tests of the Concert Round Service domain: zone maps (UC-04) and the Media Storage Adapter behind
// uploadZoneMapImage() (step 3, EF-3, FR-39). The Table Availability client is replaced by stubs on the client object
// itself, which the port bound by wire() delegates to (creating the gRPC client does not connect); the adapter is
// replaced by a fresh FakeMediaStorage per test. Test design: equivalence classes of validateZoneMap (UC-04 S-1), the
// state-transition matrix (Draft, Active) × (update, upload image, validate, activate, discard) and the decision table
// of uploadZoneMapImage, one test per row; the tables sit in the header comment of each describe.
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain/index.js';
import { adapters, FakeMediaStorage } from '../src/infrastructure/adapters.js';
import { tableAvailability } from '../src/infrastructure/clients.js';
import { resetStore, wire } from '../src/infrastructure/index.js';
import type { TableStatus__Output } from '@seats/proto/gen/seats/tableavailability/v1/TableStatus';
wire();   // the in-memory repositories, the adapter and the client object behind the domain's ports, once per process

const refused = (p: Promise<unknown>, kind: d.DomainError['kind'], check: (e: d.DomainError) => boolean = () => true) =>
  assert.rejects(p, (e: unknown) => e instanceof d.DomainError && e.kind === kind && check(e));
const unavailable = (p: Promise<unknown>, system: string) => assert.rejects(p, (e: unknown) => e instanceof d.InfrastructureError && e.system === system);
const ZONES = [{ id: 'A', name: 'Zone A' }, { id: 'B', name: 'Zone B' }];
const TABLES = [
  { tableNumber: 1, zoneId: 'A', tableTypeId: 'sofa6', capacity: 6, x: 10, y: 10 },
  { tableNumber: 2, zoneId: 'A', tableTypeId: 'round2', capacity: 2, x: 20, y: 10 },
  { tableNumber: 3, zoneId: 'B', tableTypeId: 'round2', capacity: 2, x: 10, y: 30 },
];
const T = (tableNumber: number, zoneId: string, tableTypeId: string, capacity: number): d.ZoneMapTable => ({ tableNumber, zoneId, tableTypeId, capacity, x: 0, y: 0 });
const without = (n: number) => TABLES.filter((t) => t.tableNumber !== n);
const changed = (n: number, patch: Partial<d.ZoneMapTable>) => TABLES.map((t) => (t.tableNumber === n ? { ...t, ...patch } : t));
const status = (n: number, s: string): TableStatus__Output => ({ tableNumber: n, status: s, bookingId: s === 'AVAILABLE' ? '' : `b${n}`, holdEndsAt: '' });
const defineTypes = async () => { await d.defineTableType('sofa6', { name: '6-person sofa', capacity: 6 }); await d.defineTableType('round2', { name: '2-person round table', capacity: 2 }); };
const ROUND_ON = (zoneMapId: string): d.RoundPatch => ({ zoneMapId, date: '2099-01-01', doorsOpenAt: '2099-01-01T11:00:00Z', startAt: '2099-01-01T13:00:00Z', bookingOpenAt: '2026-01-01T00:00:00Z', prices: [{ zoneId: 'A', tableTypeId: 'sofa6', packagePrice: 7200 }, { zoneId: 'A', tableTypeId: 'round2', packagePrice: 2400 }, { zoneId: 'B', tableTypeId: 'round2', packagePrice: 2000 }] });
/** A map with ZONES and TABLES in the given state (the types defined first). */
async function mapIn(state: d.ZoneMapStatus, name = 'Main hall'): Promise<string> {
  await defineTypes();
  const m = await d.createZoneMap({ name });
  await d.updateZoneMap(m.id, { zones: ZONES, tables: TABLES });
  if (state === 'Active') await d.activateZoneMap(m.id);
  return m.id;
}
/** A Published round on the map; the stub answers `booked` as its table status. */
async function publishedOn(zoneMapId: string): Promise<string> { const r = await d.createRound({ name: 'Night' }); await d.updateRound(r.id, ROUND_ON(zoneMapId)); await d.publishRound(r.id); return r.id; }

let storage: FakeMediaStorage;
let booked: TableStatus__Output[] = [];   // what the Table Availability Service answers for any round
beforeEach(async () => {
  await resetStore();
  storage = new FakeMediaStorage(); adapters.mediaStorage = storage;
  booked = [];
  tableAvailability.createRoundTableStatus = async (req) => ({ roundId: req.roundId ?? '', version: 1, tables: [] });
  tableAvailability.getRoundTableStatus = async (roundId) => ({ roundId, version: 1, tables: booked });
});

describe('createZoneMap and validateZoneMap', () => {
  test('a new map is a Draft with no zone and no table', async () => {
    const m = await d.createZoneMap({ name: 'Main hall' });
    assert.equal(m.status, 'Draft');
    assert.equal(m.name, 'Main hall');
    assert.deepEqual([m.zones, m.tables, m.imageUrl], [[], [], '']);
    assert.equal((await d.createZoneMap()).name, 'Untitled zone map');
  });
  test('an empty map lists its problems', async () => {
    const m = await d.createZoneMap();
    const v = await d.validateZoneMap(m.id);
    assert.equal(v.valid, false);
    assert.deepEqual(v.problems, ['the map has no zone']);
  });
  test('a map with zones and typed tables is valid and summarised per zone', async () => {
    await defineTypes();
    const m = await d.createZoneMap();
    const view = await d.updateZoneMap(m.id, { zones: ZONES, tables: TABLES });
    assert.deepEqual(await d.validateZoneMap(m.id), { valid: true, problems: [] });
    assert.deepEqual(view.summary, [{ zoneId: 'A', name: 'Zone A', tables: 2, capacity: 8 }, { zoneId: 'B', name: 'Zone B', tables: 1, capacity: 2 }]);
  });
  test('finds a duplicate table number, an unknown type, a table in no zone and an empty zone', async () => {
    await defineTypes();
    const m = await d.createZoneMap();
    await d.updateZoneMap(m.id, { zones: [...ZONES, { id: 'C', name: '' }], tables: [...TABLES, { tableNumber: 3, zoneId: 'Z', tableTypeId: 'vip', capacity: 0 }] });
    const v = await d.validateZoneMap(m.id);
    assert.equal(v.valid, false);
    for (const p of ['zone C has no name', 'zone C has no table', 'table number 3 is used twice', 'table 3 has no table type', 'table 3 has no seating capacity', 'table 3 is in no zone']) {
      assert.ok(v.problems.includes(p), `missing problem: ${p}`);
    }
  });
});

describe('validateZoneMap: equivalence classes (UC-04 S-1, FR-74)', () => {
  // class                        | input (zones; tables)                                   | expected problems
  // valid                        | A, B; 1 A sofa6 6, 2 A round2 2, 3 B round2 2            | none
  // table without type           | table 1 tableTypeId ''                                   | table 1 has no table type
  // unknown table type id        | table 1 'vip'                                            | table 1 has no table type
  // zone without name            | zone B ''                                                | zone B has no name
  // duplicate table number       | 2 in A and 2 in B                                        | table number 2 is used twice
  // table in an unknown zone     | table 3 in 'Z'                                           | zone Zone B has no table; table 3 is in no zone
  // no tables                    | A, B; []                                                 | zone Zone A has no table; zone Zone B has no table
  // no zones                     | []; []                                                   | the map has no zone
  // no zones, a table            | []; 1 in A                                               | table 1 is in no zone; the map has no zone
  // capacity below minimum       | table 1 capacity 0                                       | table 1 has no seating capacity
  // capacity at minimum          | table 1 capacity 1                                       | none
  // capacity non-integer         | table 1 capacity 1.5                                     | table 1 has no seating capacity
  // zone unnamed and empty       | zone C '' with no table                                  | zone C has no name; zone C has no table (named by id)
  // every fault on one table     | 3 again, in 'Z', type 'vip', capacity 0                  | used twice; no table type; no seating capacity; in no zone
  const cases: { name: string; zones: d.Zone[]; tables: d.ZoneMapTable[]; problems: string[] }[] = [
    { name: 'valid: 2 named zones, 3 typed and sized tables with unique numbers -> valid', zones: ZONES, tables: TABLES, problems: [] },
    { name: 'table without type: table 1 tableTypeId "" -> "table 1 has no table type"', zones: ZONES, tables: [T(1, 'A', '', 6), TABLES[1], TABLES[2]], problems: ['table 1 has no table type'] },
    { name: 'unknown table type id: table 1 "vip" -> "table 1 has no table type"', zones: ZONES, tables: [T(1, 'A', 'vip', 6), TABLES[1], TABLES[2]], problems: ['table 1 has no table type'] },
    { name: 'zone without name: zone B "" -> "zone B has no name"', zones: [ZONES[0], { id: 'B', name: '' }], tables: TABLES, problems: ['zone B has no name'] },
    { name: 'duplicate table number: 2 in A and 2 in B -> "table number 2 is used twice"', zones: ZONES, tables: [TABLES[0], TABLES[1], T(2, 'B', 'round2', 2)], problems: ['table number 2 is used twice'] },
    { name: 'table in an unknown zone: table 3 in "Z" -> in no zone, and Zone B left empty', zones: ZONES, tables: [TABLES[0], TABLES[1], T(3, 'Z', 'round2', 2)], problems: ['zone Zone B has no table', 'table 3 is in no zone'] },
    { name: 'no tables: 2 zones, [] -> each zone has no table', zones: ZONES, tables: [], problems: ['zone Zone A has no table', 'zone Zone B has no table'] },
    { name: 'no zones: [], [] -> "the map has no zone"', zones: [], tables: [], problems: ['the map has no zone'] },
    { name: 'no zones but a table: [], table 1 in A -> in no zone, and the map has no zone', zones: [], tables: [T(1, 'A', 'sofa6', 6)], problems: ['table 1 is in no zone', 'the map has no zone'] },
    { name: 'capacity below minimum: table 1 capacity 0 -> "table 1 has no seating capacity"', zones: ZONES, tables: [T(1, 'A', 'sofa6', 0), TABLES[1], TABLES[2]], problems: ['table 1 has no seating capacity'] },
    { name: 'capacity at minimum: table 1 capacity 1 -> valid', zones: ZONES, tables: [T(1, 'A', 'sofa6', 1), TABLES[1], TABLES[2]], problems: [] },
    { name: 'capacity non-integer: table 1 capacity 1.5 -> "table 1 has no seating capacity"', zones: ZONES, tables: [T(1, 'A', 'sofa6', 1.5), TABLES[1], TABLES[2]], problems: ['table 1 has no seating capacity'] },
    { name: 'zone unnamed and empty: zone C "" with no table -> both problems, the zone named by its id', zones: [...ZONES, { id: 'C', name: '' }], tables: TABLES, problems: ['zone C has no name', 'zone C has no table'] },
    { name: 'every fault on one table: 3 again, in "Z", type "vip", capacity 0 -> four problems', zones: ZONES, tables: [...TABLES, T(3, 'Z', 'vip', 0)], problems: ['table number 3 is used twice', 'table 3 has no table type', 'table 3 has no seating capacity', 'table 3 is in no zone'] },
  ];
  for (const c of cases) test(c.name, async () => {
    await defineTypes();
    const m = await d.createZoneMap();
    await d.updateZoneMap(m.id, { zones: c.zones, tables: c.tables });
    assert.deepEqual(await d.validateZoneMap(m.id), { valid: c.problems.length === 0, problems: c.problems });
  });
});

describe('updateZoneMap, getZoneMap and listZoneMaps: fields left out and the per-zone view (UC-04 steps 4–7)', () => {
  // class                     | input                                   | expected
  // zone without id           | { name: 'Zone A' }                      | an id generated, the name kept
  // zone without name         | { id: 'A' }                             | name ''
  // table with a number only  | { tableNumber: 1 }                      | zone '', type '', capacity 0, x 0, y 0
  // name only                 | { name: 'v2' }                          | zones and tables unchanged
  // zones only                | { zones: [] }                           | tables unchanged (saved as entered, AF-3 Save as Draft)
  // unknown map               | 'nope'                                  | not_found (update, get)
  // list, no filter           | a Draft and an Active                   | both, with their table count
  // list, status Draft        | a Draft and an Active                   | the Draft only
  // list, none                | no map                                  | []
  test('zone without id: { name: "Zone A" } -> an id is generated and the name kept', async () => {
    const m = await d.createZoneMap();
    const view = await d.updateZoneMap(m.id, { zones: [{ name: 'Zone A' }] });
    assert.equal(view.zones.length, 1); assert.equal(view.zones[0].name, 'Zone A'); assert.ok(view.zones[0].id.length > 0);
  });
  test('zone without name: { id: "A" } -> name ""', async () => {
    const m = await d.createZoneMap();
    assert.deepEqual((await d.updateZoneMap(m.id, { zones: [{ id: 'A' }] })).zones, [{ id: 'A', name: '' }]);
  });
  test('table with a number only: { tableNumber: 1 } -> zone "", type "", capacity 0, x 0, y 0', async () => {
    const m = await d.createZoneMap();
    assert.deepEqual((await d.updateZoneMap(m.id, { tables: [{ tableNumber: 1 }] })).tables, [{ tableNumber: 1, zoneId: '', tableTypeId: '', capacity: 0, x: 0, y: 0 }]);
  });
  test('name only: { name: "v2" } -> zones and tables unchanged', async () => {
    const id = await mapIn('Draft');
    const view = await d.updateZoneMap(id, { name: 'v2' });
    assert.deepEqual([view.name, view.zones, view.tables], ['v2', ZONES, TABLES]);
  });
  test('zones only: { zones: [] } -> tables unchanged, saved as entered (AF-3 Save as Draft)', async () => {
    const id = await mapIn('Draft');
    const view = await d.updateZoneMap(id, { zones: [] });
    assert.deepEqual([view.zones, view.tables.length, view.summary], [[], 3, []]);
    assert.equal((await d.validateZoneMap(id)).valid, false);
  });
  test('unknown map: "nope" -> not_found on update and get', async () => { await refused(d.updateZoneMap('nope', { name: 'x' }), 'not_found'); await refused(d.getZoneMap('nope'), 'not_found'); });
  test('list, no filter: a Draft and an Active -> both with their table count', async () => {
    const a = await mapIn('Active', 'Hall'); const b = await d.createZoneMap({ name: 'Garden' });
    assert.deepEqual(await d.listZoneMaps(), [{ id: a, name: 'Hall', status: 'Active', tables: 3 }, { id: b.id, name: 'Garden', status: 'Draft', tables: 0 }]);
  });
  test('list, status Draft: a Draft and an Active -> the Draft only', async () => {
    await mapIn('Active', 'Hall'); const b = await d.createZoneMap({ name: 'Garden' });
    assert.deepEqual((await d.listZoneMaps({ status: 'Draft' })).map((m) => m.id), [b.id]);
  });
  test('list, none: no map -> []', async () => { assert.deepEqual(await d.listZoneMaps(), []); assert.deepEqual(await d.listZoneMaps({ status: 'Active' }), []); });
});

describe('activateZoneMap', () => {
  test('refuses an invalid map with the problems as details', async () => {
    const m = await d.createZoneMap();
    await assert.rejects(d.activateZoneMap(m.id), (e: unknown) => e instanceof d.DomainError && e.kind === 'invalid' && Array.isArray(e.details) && e.details.includes('the map has no zone'));
    assert.equal((await d.getZoneMap(m.id)).status, 'Draft');
  });
  test('activates a valid map and is idempotent', async () => {
    await defineTypes();
    const m = await d.createZoneMap();
    await d.updateZoneMap(m.id, { zones: ZONES, tables: TABLES });
    assert.equal((await d.activateZoneMap(m.id)).status, 'Active');
    assert.equal((await d.activateZoneMap(m.id)).status, 'Active');
    assert.deepEqual((await d.listZoneMaps({ status: 'Active' })).map((x) => x.id), [m.id]);
    assert.deepEqual(await d.listZoneMaps({ status: 'Draft' }), []);
  });
});

describe('discardDraftZoneMap', () => {
  test('removes a Draft and refuses an Active map', async () => {
    await defineTypes();
    const draft = await d.createZoneMap();
    assert.deepEqual(await d.discardDraftZoneMap(draft.id), { removed: true });
    await refused(d.getZoneMap(draft.id), 'not_found');
    const m = await d.createZoneMap();
    await d.updateZoneMap(m.id, { zones: ZONES, tables: TABLES });
    await d.activateZoneMap(m.id);
    await refused(d.discardDraftZoneMap(m.id), 'conflict');
    await refused(d.discardDraftZoneMap('nope'), 'not_found');
  });
});

describe('updateZoneMap on an Active map (UC-04 AF-1)', () => {
  test('a booked table of a published round cannot be removed or moved; other changes pass', async () => {
    await defineTypes();
    const m = await d.createZoneMap();
    await d.updateZoneMap(m.id, { zones: ZONES, tables: TABLES });
    await d.activateZoneMap(m.id);
    const r = await d.createRound();
    await d.updateRound(r.id, { zoneMapId: m.id, date: '2099-01-01', doorsOpenAt: '2099-01-01T11:00:00Z', startAt: '2099-01-01T13:00:00Z', bookingOpenAt: '2026-01-01T00:00:00Z', prices: [{ zoneId: 'A', tableTypeId: 'sofa6', packagePrice: 7200 }, { zoneId: 'A', tableTypeId: 'round2', packagePrice: 2400 }, { zoneId: 'B', tableTypeId: 'round2', packagePrice: 2000 }] });
    tableAvailability.createRoundTableStatus = async (req) => ({ roundId: req.roundId ?? '', version: 1, tables: [] });
    tableAvailability.getRoundTableStatus = async (roundId) => ({ roundId, version: 2, tables: [{ tableNumber: 1, status: 'BOOKED', bookingId: 'b1', holdEndsAt: '' }, { tableNumber: 2, status: 'AVAILABLE', bookingId: '', holdEndsAt: '' }] });
    await d.publishRound(r.id);
    await assert.rejects(d.updateZoneMap(m.id, { tables: TABLES.filter((t) => t.tableNumber !== 1) }), (e: unknown) => e instanceof d.DomainError && e.kind === 'conflict' && JSON.stringify(e.details) === '{"bookedTables":[1]}');
    await assert.rejects(d.updateZoneMap(m.id, { tables: TABLES.map((t) => (t.tableNumber === 1 ? { ...t, x: 99 } : t)) }), (e: unknown) => e instanceof d.DomainError && e.kind === 'conflict');
    const view = await d.updateZoneMap(m.id, { name: 'Main hall v2', tables: TABLES.filter((t) => t.tableNumber !== 2) });
    assert.equal(view.name, 'Main hall v2');
    assert.equal(view.tables.length, 2);
  });
});

describe('state transitions of a zone map: (Draft, Active) × (update, upload image, validate, activate, discard)', () => {
  // state \ operation | update                                                                  | upload image | validate | activate                                         | discard
  // Draft             | any zone or table (AF-3 Save as Draft)                                  | ok           | result   | valid -> Active; invalid -> 'invalid', stays Draft | removed
  // Active            | AF-1: no Published round, or none of its tables Confirmed -> any change; | ok (the image | result   | idempotent, stays Active                          | 'conflict'
  //                   | a Confirmed table removed or moved -> 'conflict' {bookedTables}         | affects no booking) |    |                                                  |
  // unknown id        | 'not_found'                                                             | 'not_found'  | 'not_found' | 'not_found'                                    | 'not_found'
  const update: { name: string; state: d.ZoneMapStatus; round?: 'none' | 'on map' | 'other map'; booked?: TableStatus__Output[]; patch: d.ZoneMapPatch; expected: 'ok' | 'conflict'; bookedTables?: number[] }[] = [
    { name: 'Draft × update: zones and tables replaced -> ok', state: 'Draft', patch: { zones: [ZONES[0]], tables: [TABLES[0]] }, expected: 'ok' },
    { name: 'Draft × update: table 1 removed -> ok', state: 'Draft', patch: { tables: without(1) }, expected: 'ok' },
    { name: 'Active, no Published round × update: table 1 removed -> ok (AF-1 step 2)', state: 'Active', round: 'none', patch: { tables: without(1) }, expected: 'ok' },
    { name: 'Active, no Published round × update: every table moved -> ok', state: 'Active', round: 'none', patch: { tables: TABLES.map((t) => ({ ...t, x: t.x + 5 })) }, expected: 'ok' },
    { name: 'Active, a Published round with no Confirmed booking × update: table 1 removed -> ok (AVAILABLE, HELD are not Confirmed)', state: 'Active', round: 'on map', booked: [status(1, 'AVAILABLE'), status(2, 'HELD')], patch: { tables: without(1) }, expected: 'ok' },
    { name: 'Active, table 1 Confirmed × update: table 1 removed -> conflict {bookedTables: [1]}', state: 'Active', round: 'on map', booked: [status(1, 'BOOKED')], patch: { tables: without(1) }, expected: 'conflict', bookedTables: [1] },
    { name: 'Active, table 1 Confirmed × update: table 1 moved in x -> conflict', state: 'Active', round: 'on map', booked: [status(1, 'BOOKED')], patch: { tables: changed(1, { x: 99 }) }, expected: 'conflict', bookedTables: [1] },
    { name: 'Active, table 1 Confirmed × update: table 1 moved in y -> conflict', state: 'Active', round: 'on map', booked: [status(1, 'BOOKED')], patch: { tables: changed(1, { y: 99 }) }, expected: 'conflict', bookedTables: [1] },
    { name: 'Active, table 1 Confirmed × update: table 1 moved to Zone B -> conflict', state: 'Active', round: 'on map', booked: [status(1, 'BOOKED')], patch: { tables: changed(1, { zoneId: 'B' }) }, expected: 'conflict', bookedTables: [1] },
    { name: 'Active, table 1 OCCUPIED × update: table 1 removed -> conflict (checked in counts as Confirmed)', state: 'Active', round: 'on map', booked: [status(1, 'OCCUPIED')], patch: { tables: without(1) }, expected: 'conflict', bookedTables: [1] },
    { name: 'Active, tables 1 and 2 Confirmed × update: both removed -> conflict {bookedTables: [1, 2]}', state: 'Active', round: 'on map', booked: [status(1, 'BOOKED'), status(2, 'OCCUPIED')], patch: { tables: [TABLES[2]] }, expected: 'conflict', bookedTables: [1, 2] },
    { name: 'Active, table 1 Confirmed × update: table 1 retyped and resized in place -> ok (the booking copied its type, BRULE-07)', state: 'Active', round: 'on map', booked: [status(1, 'BOOKED')], patch: { tables: changed(1, { tableTypeId: 'round2', capacity: 2 }) }, expected: 'ok' },
    { name: 'Active, table 1 Confirmed × update: table 2 removed -> ok (a table with no Confirmed booking)', state: 'Active', round: 'on map', booked: [status(1, 'BOOKED')], patch: { tables: without(2) }, expected: 'ok' },
    { name: 'Active, table 1 Confirmed × update: zone names -> ok (AF-1 step 3)', state: 'Active', round: 'on map', booked: [status(1, 'BOOKED')], patch: { zones: [{ id: 'A', name: 'Front' }, { id: 'B', name: 'Back' }] }, expected: 'ok' },
    { name: 'Active, table 1 Confirmed × update: name only -> ok', state: 'Active', round: 'on map', booked: [status(1, 'BOOKED')], patch: { name: 'Main hall v2' }, expected: 'ok' },
    { name: 'Active, a Confirmed table on another map × update: table 1 removed -> ok (only the rounds on this map count)', state: 'Active', round: 'other map', booked: [status(1, 'BOOKED')], patch: { tables: without(1) }, expected: 'ok' },
  ];
  for (const c of update) test(c.name, async () => {
    const id = await mapIn(c.state);
    if (c.round === 'on map') await publishedOn(id);
    if (c.round === 'other map') await publishedOn(await mapIn('Active', 'Garden'));
    booked = c.booked ?? [];
    const before = await d.getZoneMap(id);
    if (c.expected === 'conflict') {
      await refused(d.updateZoneMap(id, c.patch), 'conflict', (e) => JSON.stringify(e.details) === JSON.stringify({ bookedTables: c.bookedTables }));
      assert.deepEqual(await d.getZoneMap(id), before);
    } else {
      const view = await d.updateZoneMap(id, c.patch);
      assert.equal(view.status, c.state);
      if (c.patch.name !== undefined) assert.equal(view.name, c.patch.name);
      if (c.patch.zones !== undefined) assert.deepEqual(view.zones, c.patch.zones);
      if (c.patch.tables !== undefined) assert.deepEqual(view.tables, c.patch.tables);
      assert.deepEqual(await d.getZoneMap(id), view);
    }
  });
  test('Active, table 1 Confirmed, the Table Availability Service does not answer × update: table 1 removed -> InfrastructureError naming it (AF-1 cannot be checked)', async () => {
    const id = await mapIn('Active');
    await publishedOn(id);
    tableAvailability.getRoundTableStatus = async () => { throw new d.InfrastructureError('the Table Availability Service', 'the Table Availability Service did not answer: UNAVAILABLE'); };
    await unavailable(d.updateZoneMap(id, { tables: without(1) }), 'the Table Availability Service');
    assert.equal((await d.getZoneMap(id)).tables.length, 3);
  });
  const ops: { name: string; state: d.ZoneMapStatus; run: (id: string) => Promise<void> }[] = [
    { name: 'Draft × upload image: hall.png -> ok, the URL kept', state: 'Draft', run: async (id) => { assert.equal((await d.uploadZoneMapImage(id, { fileName: 'hall.png' })).imageUrl, `https://storage.example/zone-maps/${id}/hall.png`); assert.equal((await d.getZoneMap(id)).status, 'Draft'); } },
    { name: 'Draft × validate: complete -> valid, stays Draft', state: 'Draft', run: async (id) => { assert.deepEqual(await d.validateZoneMap(id), { valid: true, problems: [] }); assert.equal((await d.getZoneMap(id)).status, 'Draft'); } },
    { name: 'Draft × activate: valid -> Active', state: 'Draft', run: async (id) => { assert.equal((await d.activateZoneMap(id)).status, 'Active'); assert.equal((await d.getZoneMap(id)).status, 'Active'); } },
    { name: 'Draft × activate: invalid (no tables) -> invalid with the problems, stays Draft', state: 'Draft', run: async (id) => { await d.updateZoneMap(id, { tables: [] }); await refused(d.activateZoneMap(id), 'invalid', (e) => JSON.stringify(e.details) === JSON.stringify(['zone Zone A has no table', 'zone Zone B has no table'])); assert.equal((await d.getZoneMap(id)).status, 'Draft'); } },
    { name: 'Draft × discard: -> removed, then not_found', state: 'Draft', run: async (id) => { assert.deepEqual(await d.discardDraftZoneMap(id), { removed: true }); await refused(d.getZoneMap(id), 'not_found'); } },
    { name: 'Active × upload image: hall.png -> ok (the image affects no booking), stays Active', state: 'Active', run: async (id) => { await publishedOn(id); booked = [status(1, 'BOOKED')]; assert.equal((await d.uploadZoneMapImage(id, { fileName: 'hall.png' })).imageUrl, `https://storage.example/zone-maps/${id}/hall.png`); assert.equal((await d.getZoneMap(id)).status, 'Active'); } },
    { name: 'Active × validate: complete -> valid', state: 'Active', run: async (id) => { assert.deepEqual(await d.validateZoneMap(id), { valid: true, problems: [] }); } },
    { name: 'Active × validate: after its tables were removed -> the problems are listed, the map stays Active', state: 'Active', run: async (id) => { await d.updateZoneMap(id, { tables: [] }); assert.deepEqual(await d.validateZoneMap(id), { valid: false, problems: ['zone Zone A has no table', 'zone Zone B has no table'] }); assert.equal((await d.getZoneMap(id)).status, 'Active'); } },
    { name: 'Active × activate: again -> Active, idempotent (EF-2)', state: 'Active', run: async (id) => { assert.equal((await d.activateZoneMap(id)).status, 'Active'); } },
    { name: 'Active × discard: -> conflict, the map kept', state: 'Active', run: async (id) => { await refused(d.discardDraftZoneMap(id), 'conflict'); assert.equal((await d.getZoneMap(id)).status, 'Active'); } },
  ];
  for (const c of ops) test(c.name, async () => c.run(await mapIn(c.state)));
  const unknown: { name: string; run: () => Promise<unknown> }[] = [
    { name: 'unknown id × update: -> not_found', run: () => d.updateZoneMap('nope', { name: 'x' }) },
    { name: 'unknown id × upload image: -> not_found', run: () => d.uploadZoneMapImage('nope', { fileName: 'hall.png' }) },
    { name: 'unknown id × validate: -> not_found', run: () => d.validateZoneMap('nope') },
    { name: 'unknown id × activate: -> not_found', run: () => d.activateZoneMap('nope') },
    { name: 'unknown id × discard: -> not_found', run: () => d.discardDraftZoneMap('nope') },
  ];
  for (const c of unknown) test(c.name, () => refused(c.run(), 'not_found'));
});

describe('uploadZoneMapImage: decision table (UC-04 step 3, EF-3; FR-39, the Media Storage Adapter)', () => {
  // storage  | map                       | file name   | outcome
  // accepts  | Draft                     | given       | the URL is kept on the map; the adapter stored it once
  // refuses  | Draft                     | given       | InfrastructureError 'the object storage' (the cause kept, retryable); the map unchanged; the next upload works
  // refuses  | Draft, with image + zones | given       | the earlier image and the zones are kept (EF-3 step 1)
  // accepts  | Active                    | given       | allowed (AF-1: the image affects no booking); the URL replaced
  // accepts  | Draft                     | a 2nd file  | the URL replaced, both stored
  // —        | Draft                     | missing     | invalid; the adapter is not asked
  // —        | unknown                   | given       | not_found; the adapter is not asked
  test('the image goes through the adapter and its URL is kept on the map', async () => {
    const map = await d.createZoneMap({ name: 'Main hall' });
    const updated = await d.uploadZoneMapImage(map.id, { fileName: 'hall.png' });
    assert.equal(updated.imageUrl, `https://storage.example/zone-maps/${map.id}/hall.png`);
    assert.deepEqual(storage.stored, [{ zoneMapId: map.id, fileName: 'hall.png' }]);
  });
  test('UC-04 EF-3: when the storage refuses the image the map is unchanged and the Manager learns why', async () => {
    const map = await d.createZoneMap({ name: 'Main hall' });
    storage.failNext = 1;
    await assert.rejects(d.uploadZoneMapImage(map.id, { fileName: 'hall.png' }), (e: unknown) => e instanceof d.InfrastructureError && e.system === 'the object storage' && /unchanged/.test(e.message));
    assert.equal((await d.getZoneMap(map.id)).imageUrl, '');
    const again = await d.uploadZoneMapImage(map.id, { fileName: 'hall.png' });   // the storage is back
    assert.equal(again.imageUrl, `https://storage.example/zone-maps/${map.id}/hall.png`);
  });
  test('a missing file name is refused before the adapter is asked', async () => {
    const map = await d.createZoneMap({ name: 'Main hall' });
    await assert.rejects(d.uploadZoneMapImage(map.id, {}), (e: unknown) => e instanceof d.DomainError && e.kind === 'invalid');
    assert.equal(storage.stored.length, 0);
  });
  test('storage refuses, Draft: hall.png -> InfrastructureError "the object storage", retryable, the adapter\'s refusal as its cause', async () => {
    const map = await d.createZoneMap({ name: 'Main hall' });
    storage.failNext = 1;
    await assert.rejects(d.uploadZoneMapImage(map.id, { fileName: 'hall.png' }), (e: unknown) => e instanceof d.InfrastructureError && e.system === 'the object storage' && e.retryable && e.cause instanceof d.InfrastructureError);
    assert.deepEqual(storage.stored, []);
  });
  test('storage refuses, Draft with an image and zones: second.png -> the earlier image and the zones are kept (EF-3 step 1)', async () => {
    const id = await mapIn('Draft');
    await d.uploadZoneMapImage(id, { fileName: 'first.png' });
    storage.failNext = 1;
    await unavailable(d.uploadZoneMapImage(id, { fileName: 'second.png' }), 'the object storage');
    const m = await d.getZoneMap(id);
    assert.deepEqual([m.imageUrl, m.zones, m.tables.length], [`https://storage.example/zone-maps/${id}/first.png`, ZONES, 3]);
  });
  test('storage accepts, Active: hall.png -> allowed, the URL replaced', async () => {
    const id = await mapIn('Active');
    await d.uploadZoneMapImage(id, { fileName: 'old.png' });
    const m = await d.uploadZoneMapImage(id, { fileName: 'hall.png' });
    assert.deepEqual([m.status, m.imageUrl], ['Active', `https://storage.example/zone-maps/${id}/hall.png`]);
  });
  test('storage accepts, Draft: a second file -> the URL replaced, both stored', async () => {
    const map = await d.createZoneMap();
    await d.uploadZoneMapImage(map.id, { fileName: 'a.png' });
    assert.equal((await d.uploadZoneMapImage(map.id, { fileName: 'b.png' })).imageUrl, `https://storage.example/zone-maps/${map.id}/b.png`);
    assert.deepEqual(storage.stored.map((s) => s.fileName), ['a.png', 'b.png']);
  });
  test('file name missing, Draft: "" -> invalid, the adapter not asked, the map unchanged', async () => {
    const map = await d.createZoneMap();
    await refused(d.uploadZoneMapImage(map.id, { fileName: '' }), 'invalid');
    assert.deepEqual([storage.stored.length, (await d.getZoneMap(map.id)).imageUrl], [0, '']);
  });
  test('unknown map: "nope" -> not_found, the adapter not asked', async () => {
    await refused(d.uploadZoneMapImage('nope', { fileName: 'hall.png' }), 'not_found');
    assert.equal(storage.stored.length, 0);
  });
});
