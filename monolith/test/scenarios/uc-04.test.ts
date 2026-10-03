// UC-04 Create Venue Zone Map (project document, Table 2.5; Appendix A, Table A.5): one test per flow of the MVP,
// driven through the routes the Back-office Web App calls (Appendix D, screens B5 and B6).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adapters as mediaAdapters, type FakeMediaStorage } from '@seats/concert-round/src/adapters.js';
import { activeZoneMap, call, customer, defineTableTypes, futureDay, heldBooking, inProcessOnly, manager, PRICES, publishedRound, schedule, TABLES } from './harness.js';

test('UC-04 basic flow Create Venue Zone Map', async () => {
  // steps 1–2: a new, empty map editor
  const created = await call(manager, 'POST', '/api/zone-maps', { name: 'Main hall' });
  assert.equal(created.status, 200);
  const id = created.json.id;
  assert.equal(created.json.status, 'Draft'); assert.deepEqual(created.json.zones, []); assert.deepEqual(created.json.tables, []); assert.equal(created.json.imageUrl, '');
  // step 3: the image of the venue (FR-39)
  const image = await call(manager, 'POST', `/api/zone-maps/${id}/image`, { fileName: 'hall.png' });
  assert.equal(image.status, 200); assert.match(image.json.imageUrl, /\/hall\.png$/);
  assert.equal((await call(manager, 'POST', `/api/zone-maps/${id}/image`, {})).status, 400, 'no file, no upload');
  // step 4: the zones drawn on the image and named
  const zoned = await call(manager, 'PUT', `/api/zone-maps/${id}`, { zones: [{ id: 'A', name: 'Front stage' }, { id: 'B', name: 'Bar' }] });
  assert.equal(zoned.status, 200); assert.deepEqual(zoned.json.zones, [{ id: 'A', name: 'Front stage' }, { id: 'B', name: 'Bar' }]);
  assert.deepEqual(zoned.json.summary, [{ zoneId: 'A', name: 'Front stage', tables: 0, capacity: 0 }, { zoneId: 'B', name: 'Bar', tables: 0, capacity: 0 }]);
  // steps 5–6: the table types of the venue (FR-37), then every table with its position, number, table type and capacity
  await defineTableTypes();
  const types = await call(manager, 'GET', '/api/table-types');
  assert.ok(types.json.some((t: any) => t.id === 'sofa6' && t.capacity === 6) && types.json.some((t: any) => t.id === 'round2' && t.capacity === 2));
  const tables = [...TABLES, { tableNumber: 3, zoneId: 'B', tableTypeId: 'round2', capacity: 2, x: 80, y: 60 }];
  const placed = await call(manager, 'PUT', `/api/zone-maps/${id}`, { tables });
  assert.equal(placed.status, 200); assert.deepEqual(placed.json.tables, tables);
  // step 7: the number of tables and the total capacity of each zone
  assert.deepEqual(placed.json.summary, [{ zoneId: 'A', name: 'Front stage', tables: 2, capacity: 8 }, { zoneId: 'B', name: 'Bar', tables: 1, capacity: 2 }]);
  // steps 8–9: the validation (S-1) passes
  assert.deepEqual((await call(manager, 'POST', `/api/zone-maps/${id}/validate`)).json, { valid: true, problems: [] });
  // step 10: the preview
  const preview = await call(manager, 'GET', `/api/zone-maps/${id}`);
  assert.equal(preview.json.status, 'Draft'); assert.deepEqual(preview.json.tables, tables); assert.match(preview.json.imageUrl, /hall\.png$/);
  // steps 11–12: Active, and available for selection in UC-03
  const active = await call(manager, 'POST', `/api/zone-maps/${id}/activate`);
  assert.equal(active.status, 200); assert.equal(active.json.status, 'Active');
  assert.ok((await call(manager, 'GET', '/api/zone-maps?status=Active')).json.some((m: any) => m.id === id && m.name === 'Main hall' && m.tables === 3));
  assert.equal((await call(manager, 'GET', '/api/zone-maps?status=Draft')).json.some((m: any) => m.id === id), false);
  assert.equal((await call(manager, 'POST', `/api/zone-maps/${id}/activate`)).status, 200, 'a retry finds the Active map (EF-2 step 3)');
  assert.equal((await call(manager, 'DELETE', `/api/zone-maps/${id}`)).status, 409, 'an Active map is not discarded');
  assert.equal((await call(customer('somchai'), 'GET', `/api/zone-maps/${id}`)).status, 403, 'the map editor is the back-office (FR-66)');
  const day = futureDay();
  const roundId = (await call(manager, 'POST', '/api/rounds', { name: 'On the new map' })).json.id;
  await call(manager, 'PUT', `/api/rounds/${roundId}`, { ...schedule(day), zoneMapId: id, prices: [...PRICES, { zoneId: 'B', tableTypeId: 'round2', packagePrice: 1800 }] });
  assert.deepEqual((await call(manager, 'POST', `/api/rounds/${roundId}/validate`)).json, { valid: true, problems: [] });
  assert.deepEqual((await call(manager, 'GET', `/api/rounds/${roundId}/tables`)).json.map((t: any) => [t.tableNumber, t.zoneName, t.x, t.y]), [[1, 'Front stage', 10, 20], [2, 'Front stage', 40, 20], [3, 'Bar', 80, 60]], 'rendered for the Customer as placed');
});

test('UC-04 S-1 Validate the Zone Map', async () => {
  await defineTableTypes();
  const id = (await call(manager, 'POST', '/api/zone-maps', { name: 'Faulty' })).json.id;
  assert.deepEqual((await call(manager, 'POST', `/api/zone-maps/${id}/validate`)).json, { valid: false, problems: ['the map has no zone'] });
  await call(manager, 'PUT', `/api/zone-maps/${id}`, {
    zones: [{ id: 'A', name: 'Front stage' }, { id: 'B', name: '' }, { id: 'C', name: 'Empty' }],   // step 1: a zone without a name, a zone without a table
    tables: [
      { tableNumber: 1, zoneId: 'A', tableTypeId: 'sofa6', capacity: 6 },
      { tableNumber: 1, zoneId: 'A', tableTypeId: 'round2', capacity: 2 },   // step 2: a table number used twice
      { tableNumber: 2, zoneId: 'B', tableTypeId: '', capacity: 2 },         // step 3: no table type
      { tableNumber: 3, zoneId: 'B', tableTypeId: 'vip', capacity: 4 },      // step 3: a table type the venue does not have
      { tableNumber: 4, zoneId: 'A', tableTypeId: 'round2', capacity: 0 },   // step 3: no seating capacity
      { tableNumber: 5, zoneId: 'Z', tableTypeId: 'round2', capacity: 2 },   // in no zone
    ],
  });
  const result = await call(manager, 'POST', `/api/zone-maps/${id}/validate`);
  assert.equal(result.json.valid, false);
  assert.deepEqual(result.json.problems, ['zone B has no name', 'zone Empty has no table', 'table number 1 is used twice', 'table 2 has no table type', 'table 3 has no table type', 'table 4 has no seating capacity', 'table 5 is in no zone']);
  // every check satisfied: valid
  await call(manager, 'PUT', `/api/zone-maps/${id}`, { zones: [{ id: 'A', name: 'Front stage' }, { id: 'B', name: 'Bar' }], tables: [{ tableNumber: 1, zoneId: 'A', tableTypeId: 'sofa6', capacity: 6 }, { tableNumber: 2, zoneId: 'B', tableTypeId: 'round2', capacity: 2 }] });
  assert.deepEqual((await call(manager, 'POST', `/api/zone-maps/${id}/validate`)).json, { valid: true, problems: [] });
});

test('UC-04 AF-1 Edit an Active Zone Map (todo: the refusal to remove or move a table with a Confirmed booking needs progress 2)', async () => {
  // step 2: no Published round uses the map: any zone or table may change
  const free = await activeZoneMap('Unused hall');
  const changed = [{ ...TABLES[0], x: 15, y: 25 }, { tableNumber: 3, zoneId: 'A', tableTypeId: 'round2', capacity: 2, x: 60, y: 20 }];   // table 1 moved, table 2 removed, table 3 added
  const anyChange = await call(manager, 'PUT', `/api/zone-maps/${free.id}`, { zones: [{ id: 'A', name: 'Zone A (renamed)' }], tables: changed });
  assert.equal(anyChange.status, 200); assert.equal(anyChange.json.status, 'Active'); assert.deepEqual(anyChange.json.tables, changed);
  assert.deepEqual(anyChange.json.summary, [{ zoneId: 'A', name: 'Zone A (renamed)', tables: 2, capacity: 8 }]);
  // step 1: a map that a Published round uses, with a booking on table 1
  const { round, mapId } = await publishedRound();
  const somchai = customer('somchai');
  const held = await heldBooking(somchai, round.id, 1);
  assert.ok((await call(manager, 'GET', '/api/zone-maps')).json.some((m: any) => m.id === mapId && m.status === 'Active'));
  assert.deepEqual((await call(manager, 'GET', `/api/rounds/${round.id}/bookings`)).json.map((b: any) => [b.tableNumber, b.status]), [[1, 'Held']]);
  // step 3: what does not affect the existing bookings may change: the zone names ...
  const renamed = await call(manager, 'PUT', `/api/zone-maps/${mapId}`, { zones: [{ id: 'A', name: 'Front stage' }] });
  assert.equal(renamed.status, 200); assert.deepEqual(renamed.json.zones, [{ id: 'A', name: 'Front stage' }]);
  assert.deepEqual(renamed.json.tables, TABLES, 'every table keeps its zone and its position');
  // ... and the tables without a booking: table 2 moves, table 1 stays where it is
  const moved = await call(manager, 'PUT', `/api/zone-maps/${mapId}`, { tables: [TABLES[0], { ...TABLES[1], x: 70, y: 70 }] });
  assert.equal(moved.status, 200);
  assert.deepEqual(moved.json.tables.map((t: any) => [t.tableNumber, t.zoneId, t.x, t.y]), [[1, 'A', 10, 20], [2, 'A', 70, 70]]);
  // the booking carries its own copy of the table (BRULE-07): the hold and the round's map are untouched
  assert.equal((await call(somchai, 'GET', `/api/bookings/${held.id}`)).json.status, 'Held');
  assert.equal((await call(somchai, 'GET', `/api/rounds/${round.id}/table-status`)).json.tables[0].status, 'HELD');
  assert.equal((await call(somchai, 'GET', `/api/rounds/${round.id}/tables`)).json[1].x, 70, 'the Customer sees the table where it is now');
  // step 4: the map is still Active
  assert.equal((await call(manager, 'GET', `/api/zone-maps/${mapId}`)).json.status, 'Active');
});

test('UC-04 AF-3 Save as Draft', async () => {
  await defineTableTypes();
  const created = await call(manager, 'POST', '/api/zone-maps', { name: 'Next season' });
  const id = created.json.id;
  const saved = await call(manager, 'PUT', `/api/zone-maps/${id}`, { zones: [{ id: 'A', name: 'Zone A' }], tables: TABLES });
  assert.equal(saved.status, 200); assert.equal(saved.json.status, 'Draft');
  assert.equal((await call(manager, 'GET', `/api/zone-maps/${id}`)).json.status, 'Draft');
  assert.ok((await call(manager, 'GET', '/api/zone-maps?status=Draft')).json.some((m: any) => m.id === id));
  // step 1: it cannot be selected in UC-03: not among the Active maps, and a round on it does not validate
  assert.equal((await call(manager, 'GET', '/api/zone-maps?status=Active')).json.some((m: any) => m.id === id), false);
  const day = futureDay();
  const roundId = (await call(manager, 'POST', '/api/rounds', { name: 'On a draft map' })).json.id;
  await call(manager, 'PUT', `/api/rounds/${roundId}`, { ...schedule(day), zoneMapId: id, prices: PRICES });
  assert.deepEqual((await call(manager, 'POST', `/api/rounds/${roundId}/validate`)).json, { valid: false, problems: ['the zone map is not Active'] });
  assert.equal((await call(manager, 'POST', `/api/rounds/${roundId}/publish`)).status, 400);
  // a Draft can be edited again, or discarded
  assert.equal((await call(manager, 'PUT', `/api/zone-maps/${id}`, { name: 'Next season v2' })).json.name, 'Next season v2');
  assert.deepEqual((await call(manager, 'DELETE', `/api/zone-maps/${id}`)).json, { removed: true });
  assert.equal((await call(manager, 'GET', `/api/zone-maps/${id}`)).status, 404);
});

test('UC-04 EF-1 Validation Fails', async () => {
  await defineTableTypes();
  const id = (await call(manager, 'POST', '/api/zone-maps', { name: 'Needs fixing' })).json.id;
  await call(manager, 'PUT', `/api/zone-maps/${id}`, { zones: [{ id: 'A', name: '' }], tables: [{ tableNumber: 1, zoneId: 'A', tableTypeId: 'sofa6', capacity: 6 }, { tableNumber: 1, zoneId: 'A', tableTypeId: 'round2', capacity: 2 }] });
  // {Validation Result} step 1: the invalid zones and tables with the reasons; the map is not activated
  const refused = await call(manager, 'POST', `/api/zone-maps/${id}/activate`);
  assert.equal(refused.status, 400); assert.equal(refused.json.error, 'the zone map is not valid');
  assert.deepEqual(refused.json.details, ['zone A has no name', 'table number 1 is used twice']);
  assert.equal((await call(manager, 'GET', `/api/zone-maps/${id}`)).json.status, 'Draft');
  assert.deepEqual((await call(manager, 'POST', `/api/zone-maps/${id}/validate`)).json, { valid: false, problems: refused.json.details });
  // steps 2–3: the zones and tables corrected, back at {Validate and Activate}
  await call(manager, 'PUT', `/api/zone-maps/${id}`, { zones: [{ id: 'A', name: 'Zone A' }], tables: TABLES });
  assert.deepEqual((await call(manager, 'POST', `/api/zone-maps/${id}/validate`)).json, { valid: true, problems: [] });
  assert.equal((await call(manager, 'POST', `/api/zone-maps/${id}/activate`)).json.status, 'Active');
});

test.todo('UC-04 EF-2 Zone Map Cannot Be Saved: the in-memory store cannot fail (the retry that finds the Active map is asserted in the basic flow)');
test('UC-04 EF-3 Zone Map Image Cannot Be Uploaded', inProcessOnly('the fake media storage is told to refuse the next upload'), async () => {
  const id = (await call(manager, 'POST', '/api/zone-maps', { name: 'Garden stage' })).json.id;
  (mediaAdapters.mediaStorage as FakeMediaStorage).failNext = 1;                       // the object storage refuses the next image
  const failed = await call(manager, 'POST', `/api/zone-maps/${id}/image`, { fileName: 'garden.png' });
  assert.equal(failed.status, 502); assert.match(failed.json.error, /could not be stored; the zone map is unchanged/);
  assert.equal(failed.json.details.system, 'the object storage');   // an InfrastructureError names the system that failed
  assert.equal((await call(manager, 'GET', `/api/zone-maps/${id}`)).json.imageUrl, '', 'step 3 is repeated later; the map keeps its state');
  const ok = await call(manager, 'POST', `/api/zone-maps/${id}/image`, { fileName: 'garden.png' });
  assert.equal(ok.status, 200); assert.match(ok.json.imageUrl, /garden\.png$/);
});
