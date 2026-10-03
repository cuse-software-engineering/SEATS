// Unit tests of the Concert Round Service domain: table types and zone maps (UC-04). The Table Availability client
// is replaced by a stub on the client object itself, which the port bound by wire() delegates to (creating the gRPC
// client does not connect).
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain/index.js';
import { tableAvailability } from '../src/infrastructure/clients.js';
import { resetStore, wire } from '../src/infrastructure/index.js';
wire();   // the in-memory repositories and the client object behind the domain's ports, once per process

const refused = (p: Promise<unknown>, kind: d.DomainError['kind']) => assert.rejects(p, (e: unknown) => e instanceof d.DomainError && e.kind === kind);
const ZONES = [{ id: 'A', name: 'Zone A' }, { id: 'B', name: 'Zone B' }];
const TABLES = [
  { tableNumber: 1, zoneId: 'A', tableTypeId: 'sofa6', capacity: 6, x: 10, y: 10 },
  { tableNumber: 2, zoneId: 'A', tableTypeId: 'round2', capacity: 2, x: 20, y: 10 },
  { tableNumber: 3, zoneId: 'B', tableTypeId: 'round2', capacity: 2, x: 10, y: 30 },
];
const defineTypes = async () => { await d.defineTableType('sofa6', { name: '6-person sofa', capacity: 6 }); await d.defineTableType('round2', { name: '2-person round table', capacity: 2 }); };

beforeEach(async () => { await resetStore(); });

describe('defineTableType', () => {
  test('validates id, name and capacity', async () => {
    await refused(d.defineTableType('', { name: 'x', capacity: 2 }), 'invalid');
    await refused(d.defineTableType('t', { name: '', capacity: 2 }), 'invalid');
    await refused(d.defineTableType('t', { name: 'x', capacity: 0 }), 'invalid');
    await refused(d.defineTableType('t', { name: 'x', capacity: 1.5 }), 'invalid');
  });
  test('stores the type and lists it; a second definition replaces it', async () => {
    await d.defineTableType('sofa6', { name: '6-person sofa', capacity: 6, packageContent: 'one bottle' });
    await d.defineTableType('sofa6', { name: '6-person sofa', capacity: 8 });
    assert.deepEqual(await d.listTableTypes(), [{ id: 'sofa6', name: '6-person sofa', capacity: 8, packageContent: '' }]);
  });
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
