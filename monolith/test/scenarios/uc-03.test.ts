// UC-03 Create Concert Round (project document, Table 2.4; Appendix A, Table A.4): one test per flow of the MVP,
// driven through the routes the Back-office Web App calls (Appendix D, screens B3 and B4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRICES, activeZoneMap, at, call, customer, futureDay, heldBooking, manager, minutesFromNow, publishedRound, schedule, tableStatus } from './harness.js';

test('UC-03 basic flow Create Concert Round', async () => {
  const map = await activeZoneMap();
  const day = futureDay();
  // steps 1–2: a new, empty round form
  const created = await call(manager, 'POST', '/api/rounds', { name: 'Friday Live' });
  assert.equal(created.status, 200);
  const id = created.json.id;
  assert.equal(created.json.status, 'Draft'); assert.equal(created.json.artist, ''); assert.equal(created.json.date, ''); assert.equal(created.json.zoneMapId, ''); assert.deepEqual(created.json.prices, []); assert.equal(created.json.checkInWindow, null);
  // steps 3–5: the concert details, the times and the booking-open time; the check-in window derived from the business parameters (BRULE-04, BRULE-05)
  const bookingOpenAt = minutesFromNow(-1);
  const details = await call(manager, 'PUT', `/api/rounds/${id}`, { artist: 'The Band', ...schedule(day, bookingOpenAt) });
  assert.equal(details.status, 200); assert.equal(details.json.status, 'Draft'); assert.equal(details.json.bookingOpenAt, bookingOpenAt);
  assert.deepEqual(details.json.checkInWindow, { roundId: id, opensAt: `${day}T18:00:00.000Z`, startAt: `${day}T20:00:00.000Z`, graceEndsAt: `${day}T20:30:00.000Z` });
  // steps 6–7: the Active zone maps, then the zones, tables and table types of the chosen one
  const maps = await call(manager, 'GET', '/api/zone-maps?status=Active');
  assert.ok(maps.json.some((m: any) => m.id === map.id && m.tables === 2));
  const chosen = await call(manager, 'GET', `/api/zone-maps/${map.id}`);
  assert.deepEqual(chosen.json.tables.map((t: any) => [t.tableNumber, t.zoneId, t.tableTypeId]), [[1, 'A', 'sofa6'], [2, 'A', 'round2']]);
  // step 8: the map chosen and table 2 marked not for sale in this round
  const withMap = await call(manager, 'PUT', `/api/rounds/${id}`, { zoneMapId: map.id, tablesNotForSale: [2] });
  assert.equal(withMap.status, 200); assert.equal(withMap.json.zoneMapId, map.id); assert.deepEqual(withMap.json.tablesNotForSale, [2]);
  // steps 9–10: the package price and content of each table type in each zone (BRULE-08); the tables for sale and the capacity of each zone
  const priced = await call(manager, 'PUT', `/api/rounds/${id}`, { prices: PRICES });
  assert.equal(priced.status, 200); assert.deepEqual(priced.json.prices, PRICES);
  const tables = await call(manager, 'GET', `/api/rounds/${id}/tables`);
  assert.deepEqual(tables.json.map((t: any) => [t.tableNumber, t.forSale, t.packagePrice, t.packageContent, t.capacity]), [[1, true, 7200, 'sofa, 2 bottles', 6], [2, false, 2400, 'round table, 1 bottle', 2]]);
  const forSale = tables.json.filter((t: any) => t.forSale);
  assert.equal(forSale.length, 1); assert.equal(forSale.reduce((s: number, t: any) => s + t.capacity, 0), 6);
  // steps 11–12: the validation (S-1) passes
  assert.deepEqual((await call(manager, 'POST', `/api/rounds/${id}/validate`)).json, { valid: true, problems: [] });
  // step 13: the preview as the Customer will see it
  const preview = await call(manager, 'GET', `/api/rounds/${id}`);
  assert.equal(preview.json.tables.length, 2); assert.equal(preview.json.holdPeriodMinutes, 15); assert.equal(preview.json.status, 'Draft');
  // steps 14–15: Published; the business parameters in force are kept with the round (FR-38); visible to Customers; the table map of the round exists
  const published = await call(manager, 'POST', `/api/rounds/${id}/publish`);
  assert.equal(published.status, 200); assert.equal(published.json.status, 'Published');
  assert.deepEqual(published.json.parameters, { holdPeriodMinutes: 15, checkInWindowHours: 2, gracePeriodMinutes: 30, extraPersonFee: 600 });
  const somchai = customer('somchai');
  const listed = (await call(somchai, 'GET', '/api/rounds')).json.find((r: any) => r.id === id);
  assert.deepEqual([listed.name, listed.status, listed.availableTables, listed.tablesForSale], ['Friday Live', 'open', 1, 1]);
  const status = await call(somchai, 'GET', `/api/rounds/${id}/table-status`);
  assert.deepEqual(status.json.tables.map((t: any) => [t.tableNumber, t.status]), [[1, 'AVAILABLE'], [2, 'NOT_FOR_SALE']]);
  assert.deepEqual((await call(manager, 'GET', `/api/rounds/${id}/bookings`)).json, [], 'the live view shows the round without a booking yet');
  // a retry of publish finds the Published round and creates no second one (EF-2 step 3); a Published round is no Draft to discard; only the manager publishes (FR-66)
  assert.equal((await call(manager, 'POST', `/api/rounds/${id}/publish`)).status, 200);
  assert.equal((await call(somchai, 'GET', `/api/rounds/${id}/table-status`)).json.version, status.json.version, 'the table map was not created twice');
  assert.equal((await call(manager, 'DELETE', `/api/rounds/${id}`)).status, 409);
  assert.equal((await call(somchai, 'POST', `/api/rounds/${id}/publish`)).status, 403);
  assert.equal((await call(somchai, 'PUT', `/api/rounds/${id}`, { name: 'x' })).status, 403);
});

test('UC-03 S-1 Validate the Round', async () => {
  const map = await activeZoneMap();
  const day = futureDay();
  const { round: other } = await publishedRound({ zoneMapId: map.id });   // a Published round on another day
  const id = (await call(manager, 'POST', '/api/rounds', { name: 'To validate' })).json.id;
  // an empty form: the schedule and the zone map are missing
  const empty = await call(manager, 'POST', `/api/rounds/${id}/validate`);
  assert.equal(empty.json.valid, false);
  assert.ok(empty.json.problems.includes('date, doors-open time, start time and booking-open time are required'));
  assert.ok(empty.json.problems.includes('the round has no zone map'));
  // S-1 step 1: the doors-open time, the start time and the booking-open time in order, the booking-open time before the start
  await call(manager, 'PUT', `/api/rounds/${id}`, { date: day, doorsOpenAt: at(day, '21'), startAt: at(day, '20'), bookingOpenAt: at(day, '22'), zoneMapId: map.id, prices: [PRICES[0]] });
  const problems = (await call(manager, 'POST', `/api/rounds/${id}/validate`)).json.problems;
  assert.ok(problems.includes('the doors-open time must be before the start time'), problems.join('; '));
  assert.ok(problems.includes('the booking-open time must be before the start time'), problems.join('; '));
  // S-1 step 2: every table type for sale has a package price in each zone
  assert.ok(problems.includes('no package price for 2-person round table in Zone A'), problems.join('; '));
  assert.equal(problems.length, 3);
  // S-1 step 3: no other Published round overlaps the same date and time
  await call(manager, 'PUT', `/api/rounds/${id}`, { ...schedule(other.date), prices: PRICES });
  assert.deepEqual((await call(manager, 'POST', `/api/rounds/${id}/validate`)).json, { valid: false, problems: [`overlaps the published round "${other.name}"`] });
  // a table not for sale needs no price; on its own day the round is valid
  await call(manager, 'PUT', `/api/rounds/${id}`, { ...schedule(day), prices: [PRICES[0]], tablesNotForSale: [2] });
  assert.deepEqual((await call(manager, 'POST', `/api/rounds/${id}/validate`)).json, { valid: true, problems: [] });
});

test('UC-03 AF-1 Save as Draft', async () => {
  const map = await activeZoneMap();
  const day = futureDay();
  const id = (await call(manager, 'POST', '/api/rounds', { name: 'Saturday Jazz' })).json.id;
  const saved = await call(manager, 'PUT', `/api/rounds/${id}`, { artist: 'Trio', ...schedule(day), zoneMapId: map.id, prices: PRICES });
  assert.equal(saved.status, 200); assert.equal(saved.json.status, 'Draft'); assert.equal(saved.json.parameters, null, 'the parameters are fixed at publish');
  assert.equal((await call(manager, 'GET', `/api/rounds/${id}`)).json.status, 'Draft');
  // step 1: not visible to Customers, no booking possible
  const somchai = customer('somchai');
  assert.equal((await call(somchai, 'GET', '/api/rounds')).json.some((r: any) => r.id === id), false);
  const held = await call(somchai, 'POST', '/api/bookings', { roundId: id, tableNumber: 1 });
  assert.equal(held.status, 409); assert.equal(held.json.error, 'the round is not open for booking');
  assert.equal((await call(somchai, 'GET', `/api/rounds/${id}/table-status`)).status, 404, 'a Draft round has no table map yet');
  // a Draft can be edited again later, or discarded
  assert.equal((await call(manager, 'PUT', `/api/rounds/${id}`, { artist: 'Quartet' })).json.artist, 'Quartet');
  assert.deepEqual((await call(manager, 'DELETE', `/api/rounds/${id}`)).json, { removed: true });
  assert.equal((await call(manager, 'GET', `/api/rounds/${id}`)).status, 404);
});

test('UC-03 AF-3 Edit a Published Round (todo: the fields fixed by a Confirmed booking need progress 2)', async () => {
  // step 2: the booking-open time has not passed: any field may change
  const early = await publishedRound({ bookingOpenAt: minutesFromNow(60) });
  const newDay = futureDay();
  const anyField = await call(manager, 'PUT', `/api/rounds/${early.round.id}`, { artist: 'Another Band', ...schedule(newDay, minutesFromNow(30)), tablesNotForSale: [2], prices: [{ ...PRICES[0], packagePrice: 8000 }, PRICES[1]] });
  assert.equal(anyField.status, 200); assert.equal(anyField.json.status, 'Published');
  assert.equal(anyField.json.confirmedBookings, 0, 'step 1: the number of Confirmed bookings is shown');
  assert.equal(anyField.json.artist, 'Another Band'); assert.equal(anyField.json.date, newDay); assert.deepEqual(anyField.json.tablesNotForSale, [2]); assert.equal(anyField.json.prices[0].packagePrice, 8000);
  assert.equal(anyField.json.checkInWindow.graceEndsAt, `${newDay}T20:30:00.000Z`, 'the check-in window follows the new start');
  // step 3: after the booking-open time, with no Confirmed booking, the concert details, the date and the times may change
  const open = await publishedRound();
  await heldBooking(customer('somchai'), open.round.id, 1);   // a Held booking is not a Confirmed one
  const laterDay = futureDay();
  const details = await call(manager, 'PUT', `/api/rounds/${open.round.id}`, { name: 'Friday Live (moved)', artist: 'The Band + guest', date: laterDay, doorsOpenAt: at(laterDay, '19'), startAt: at(laterDay, '21') });
  assert.equal(details.status, 200); assert.equal(details.json.confirmedBookings, 0);
  assert.equal(details.json.name, 'Friday Live (moved)'); assert.equal(details.json.date, laterDay); assert.equal(details.json.checkInWindow.opensAt, `${laterDay}T19:00:00.000Z`);
  // ... but the zone map, the tables for sale, the prices and the booking-open time are fixed (BRULE-07, FR-35): refused with the number of Confirmed bookings
  const fixed: Record<string, unknown>[] = [{ prices: [{ ...PRICES[0], packagePrice: 9000 }, PRICES[1]] }, { tablesNotForSale: [2] }, { zoneMapId: early.mapId }, { bookingOpenAt: minutesFromNow(60) }];
  for (const patch of fixed) {
    const field = Object.keys(patch)[0];
    const refused = await call(manager, 'PUT', `/api/rounds/${open.round.id}`, patch);
    assert.equal(refused.status, 409, field);
    assert.equal(refused.json.error, `after the booking-open time these fields are fixed: ${field}`);
    assert.deepEqual(refused.json.details, { confirmedBookings: 0 });
  }
  const mixed = await call(manager, 'PUT', `/api/rounds/${open.round.id}`, { artist: 'Nobody', prices: PRICES });
  assert.equal(mixed.status, 409, 'a change that mixes allowed and fixed fields is refused as a whole');
  const unchanged = await call(manager, 'GET', `/api/rounds/${open.round.id}`);
  assert.equal(unchanged.json.artist, 'The Band + guest'); assert.deepEqual(unchanged.json.prices, PRICES); assert.deepEqual(unchanged.json.tablesNotForSale, []);
  assert.equal(unchanged.json.zoneMapId, open.mapId); assert.equal(unchanged.json.bookingOpenAt, open.round.bookingOpenAt);
  // step 4: the round is still Published and open, the hold untouched
  const late = customer('late');
  assert.equal((await call(late, 'GET', '/api/rounds')).json.find((r: any) => r.id === open.round.id)?.status, 'open');
  assert.equal((await tableStatus(late, open.round.id, 1)).status, 'HELD');
});

test('UC-03 EF-1 Validation Fails', async () => {
  const map = await activeZoneMap();
  const day = futureDay();
  const id = (await call(manager, 'POST', '/api/rounds', { name: 'Needs fixing' })).json.id;
  await call(manager, 'PUT', `/api/rounds/${id}`, { date: day, doorsOpenAt: at(day, '20'), startAt: at(day, '18'), bookingOpenAt: minutesFromNow(-1), zoneMapId: map.id, prices: [PRICES[1]] });
  // {Validation Result} step 1: the invalid fields and the reasons (times out of order, unpriced table type)
  const result = await call(manager, 'POST', `/api/rounds/${id}/validate`);
  assert.equal(result.json.valid, false);
  assert.deepEqual(result.json.problems, ['the doors-open time must be before the start time', 'no package price for 6-person sofa in Zone A']);
  // publishing anyway is refused with the same reasons; the round stays Draft
  const refused = await call(manager, 'POST', `/api/rounds/${id}/publish`);
  assert.equal(refused.status, 400); assert.equal(refused.json.error, 'the round is not valid'); assert.deepEqual(refused.json.details, result.json.problems);
  assert.equal((await call(manager, 'GET', `/api/rounds/${id}`)).json.status, 'Draft');
  assert.equal((await call(customer('somchai'), 'GET', `/api/rounds/${id}/table-status`)).status, 404);
  // steps 2–3: the fields corrected, back at {Review and Publish}
  await call(manager, 'PUT', `/api/rounds/${id}`, { doorsOpenAt: at(day, '18'), startAt: at(day, '20'), prices: PRICES });
  assert.deepEqual((await call(manager, 'POST', `/api/rounds/${id}/validate`)).json, { valid: true, problems: [] });
  assert.equal((await call(manager, 'POST', `/api/rounds/${id}/publish`)).json.status, 'Published');
});

test.todo('UC-03 EF-2 Round Cannot Be Saved: the in-memory store cannot fail (the retry that finds the Published round is asserted in the basic flow)');

test('UC-03 AF-3 Edit a Published Round: a changed sale list rebuilds the table map before booking opens', async () => {
  const { round } = await publishedRound({ bookingOpenAt: minutesFromNow(60), publish: true });
  assert.equal((await tableStatus(manager, round.id, 2)).status, 'AVAILABLE');
  const changed = await call(manager, 'PUT', `/api/rounds/${round.id}`, { tablesNotForSale: [2] });
  assert.equal(changed.status, 200); assert.deepEqual(changed.json.tablesNotForSale, [2]);
  assert.equal((await tableStatus(manager, round.id, 2)).status, 'NOT_FOR_SALE', 'the read model follows the round');
  const listed = (await call(customer('somchai'), 'GET', '/api/rounds')).json.find((r: any) => r.id === round.id);
  assert.equal(listed.tablesForSale, 1); assert.equal(listed.availableTables, 1);
  const back = await call(manager, 'PUT', `/api/rounds/${round.id}`, { tablesNotForSale: [] });
  assert.equal(back.status, 200);
  assert.equal((await tableStatus(manager, round.id, 2)).status, 'AVAILABLE');
});

test('UC-03 AF-1 Save as Draft: a Draft round is not readable by a Customer', async () => {
  const map = await activeZoneMap();
  const id = (await call(manager, 'POST', '/api/rounds', { name: 'Not yet public' })).json.id;
  await call(manager, 'PUT', `/api/rounds/${id}`, { zoneMapId: map.id });
  const somchai = customer('somchai');
  assert.equal((await call(somchai, 'GET', `/api/rounds/${id}`)).status, 404);
  assert.equal((await call(somchai, 'GET', `/api/rounds/${id}/tables`)).status, 404);
  assert.equal((await call(manager, 'GET', `/api/rounds/${id}`)).status, 200, 'the Manager still sees it');
  assert.equal((await call(manager, 'GET', `/api/rounds/${id}/tables`)).json.length, 2);
});
