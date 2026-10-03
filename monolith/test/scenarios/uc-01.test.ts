// UC-01 Reserve a Specific Table (project document, Table 2.2; Appendix A, Table A.2): one test per flow of the MVP,
// driven through the routes the Customer Web App calls (Appendix D, screens C1 to C6). Progress 1 stops at the
// payment: step 15 answers 501, so steps 16 to 19 and the LINE notices (S-1, EF-3) are progress 2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expireUnpaidBookings } from '@seats/booking/src/domain/index.js';
import { anonymous, call, customer, heldBooking, inProcessOnly, manager, minutesFromNow, poll, publishedRound, tableStatus } from './harness.js';

test('UC-01 basic flow Reserve a Specific Table', async () => {
  const { round, day } = await publishedRound();
  const somchai = customer('somchai');
  // {Browse Rounds} step 3: the upcoming rounds with artist, date, start time, booking-open time and status
  const rounds = await call(somchai, 'GET', '/api/rounds');
  assert.equal(rounds.status, 200);
  const listed = rounds.json.find((r: any) => r.id === round.id);
  assert.ok(listed, 'the published round is listed');
  assert.equal(listed.artist, 'The Band'); assert.equal(listed.date, day); assert.equal(listed.startAt, round.startAt); assert.equal(listed.bookingOpenAt, round.bookingOpenAt);
  assert.equal(listed.status, 'open'); assert.equal(listed.availableTables, 2); assert.equal(listed.tablesForSale, 2);
  // step 4: the round selected
  assert.equal((await call(somchai, 'GET', `/api/rounds/${round.id}`)).json.status, 'Published');
  // {View the Zone Map} step 5: every table with its number, zone, table type and package price; the status from the polled map (ADR-09)
  const tables = await call(somchai, 'GET', `/api/rounds/${round.id}/tables`);
  assert.equal(tables.status, 200);
  assert.deepEqual(tables.json.map((t: any) => [t.tableNumber, t.zoneName, t.tableTypeName, t.packagePrice, t.forSale]), [[1, 'Zone A', '6-person sofa', 7200, true], [2, 'Zone A', '2-person round table', 2400, true]]);
  const map = await poll(somchai, round.id);
  assert.equal(map.status, 200); assert.equal(map.etag, String(map.json.version));
  assert.deepEqual(map.json.tables.map((t: any) => t.status), ['AVAILABLE', 'AVAILABLE']);
  assert.equal((await poll(somchai, round.id, map.etag as string)).status, 304, 'an unchanged map costs one small response');
  // {Hold the Table} steps 6–8: the hold for the hold period of 15 minutes (BRULE-02); the table held for every other customer
  const held = await call(somchai, 'POST', '/api/bookings', { roundId: round.id, tableNumber: 1 });
  assert.equal(held.status, 200); assert.equal(held.json.status, 'Held');
  assert.ok(held.json.remainingHoldSeconds > 14 * 60 && held.json.remainingHoldSeconds <= 15 * 60, 'the remaining hold time is displayed');
  assert.deepEqual(held.json.history.map((h: any) => [h.status, h.by]), [['Held', somchai['x-user-id']]]);
  const malee = customer('malee');
  const refreshed = await poll(malee, round.id, map.etag as string);
  assert.equal(refreshed.status, 200, 'the map changed: its version moved on');
  assert.equal(refreshed.json.tables[0].status, 'HELD'); assert.equal(refreshed.json.tables[0].bookingId, held.json.id); assert.equal(refreshed.json.tables[0].holdEndsAt, held.json.holdEndsAt);
  assert.equal(refreshed.json.tables[1].status, 'AVAILABLE');
  // step 9: the booking summary (round, table, package) and the remaining hold time
  const summary = await call(somchai, 'GET', `/api/bookings/${held.json.id}`);
  assert.equal(summary.status, 200);
  assert.equal(summary.json.roundId, round.id); assert.equal(summary.json.tableNumber, 1); assert.equal(summary.json.zoneName, 'Zone A'); assert.equal(summary.json.tableTypeId, 'sofa6'); assert.equal(summary.json.capacity, 6);
  assert.ok(summary.json.remainingHoldSeconds > 0); assert.equal(summary.json.fee, null, 'no fee before the party size');
  // steps 10–11: the party size, then the full table fee: the package price plus the extra-person fee above the capacity (BRULE-08, BRULE-09)
  const fee = await call(somchai, 'PUT', `/api/bookings/${held.json.id}/party-size`, { partySize: 7 });
  assert.equal(fee.status, 200); assert.equal(fee.json.partySize, 7);
  assert.deepEqual(fee.json.fee, { packagePrice: 7200, extraPersons: 1, extraPersonFee: 600, fullTableFee: 7800 });
  assert.deepEqual((await call(somchai, 'PUT', `/api/bookings/${held.json.id}/party-size`, { partySize: 4 })).json.fee, { packagePrice: 7200, extraPersons: 0, extraPersonFee: 600, fullTableFee: 7200 }, 'no extra person within the capacity');
  // step 12: UC-09 included: on the first booking the profile is created with the consent
  assert.equal((await call(somchai, 'GET', '/api/customers/me')).status, 404, 'no profile before the first booking');
  const profile = await call(somchai, 'POST', '/api/customers/me', { name: 'Somchai', phone: '0812345678', consent: true });
  assert.equal(profile.status, 200); assert.ok(profile.json.consentAt);
  // steps 13–14: the booking terms (BRULE-16), then accepted
  const terms = await call(somchai, 'GET', `/api/bookings/${held.json.id}/terms`);
  assert.equal(terms.status, 200); assert.equal(terms.json.terms.length, 4);
  assert.match(terms.json.terms[0], /Full payment confirms the booking/);
  assert.equal(terms.json.checkInWindow.opensAt, `${day}T18:00:00.000Z`, 'the check-in window opens 2 hours before the show (BRULE-04)');
  assert.equal(terms.json.checkInWindow.graceEndsAt, `${day}T20:30:00.000Z`, 'the grace period is 30 minutes after the start (BRULE-05)');
  assert.match(terms.json.terms[3], /no-show/);
  const accepted = await call(somchai, 'POST', `/api/bookings/${held.json.id}/terms-acceptance`);
  assert.equal(accepted.status, 200); assert.equal(accepted.json.termsAccepted, true); assert.equal(accepted.json.status, 'Held');
  // step 15: UC-10 included: progress 1 ends here, the Payment Service is wired in progress 2
  const payment = await call(somchai, 'POST', `/api/bookings/${held.json.id}/payment`);
  assert.equal(payment.status, 501, 'startPayment() is progress 2: the flow stops at {Pay the Full Table Fee}');
  const still = await call(somchai, 'GET', `/api/bookings/${held.json.id}`);
  assert.equal(still.json.status, 'Held'); assert.equal(still.json.termsAccepted, true); assert.equal(still.json.fee.fullTableFee, 7200);
  // My Bookings lists the booking (FR-40) and the manager sees it in the live view (FR-42)
  assert.deepEqual((await call(somchai, 'GET', '/api/customers/me/bookings')).json.map((b: any) => b.id), [held.json.id]);
  assert.deepEqual((await call(manager, 'GET', `/api/rounds/${round.id}/bookings`)).json.map((b: any) => [b.id, b.status]), [[held.json.id, 'Held']]);
});

test.todo('UC-01 S-1 Notify the Customer by LINE: the Booking Service does not call the Notification Service yet (Notification Service not wired, progress 2)');

test('UC-01 AF-1 Round Not Yet Open for Booking', async () => {
  const opensAt = minutesFromNow(60);
  const { round } = await publishedRound({ bookingOpenAt: opensAt });
  const somchai = customer('somchai');
  const listed = (await call(somchai, 'GET', '/api/rounds')).json.find((r: any) => r.id === round.id);
  assert.equal(listed.status, 'not yet open'); assert.equal(listed.bookingOpenAt, opensAt);
  // step 1: the round's details and its booking-open time are shown; the zone map is not
  const details = await call(somchai, 'GET', `/api/rounds/${round.id}`);
  assert.equal(details.status, 200); assert.equal(details.json.bookingOpenAt, opensAt); assert.equal(details.json.status, 'Published');
  // a hold attempted before the booking-open time is refused (BRULE-07) and nothing changes
  const held = await call(somchai, 'POST', '/api/bookings', { roundId: round.id, tableNumber: 1 });
  assert.equal(held.status, 409); assert.equal(held.json.error, 'the round is not open for booking');
  assert.equal((await tableStatus(somchai, round.id, 1)).status, 'AVAILABLE');
  assert.deepEqual((await call(somchai, 'GET', '/api/customers/me/bookings')).json, []);
});

test('UC-01 AF-2 Round Sold Out', async () => {
  const { round } = await publishedRound();
  const first = customer('first'), second = customer('second'), late = customer('late');
  await heldBooking(first, round.id, 1);
  const before = (await call(late, 'GET', '/api/rounds')).json.find((r: any) => r.id === round.id);
  assert.equal(before.status, 'open'); assert.equal(before.availableTables, 1);
  const map = await poll(late, round.id);                                   // the map is displayed ...
  await heldBooking(second, round.id, 2);                                   // ... while the last available table is taken
  // step 1: the round is sold out; the refreshed map has no available table
  const listed = (await call(late, 'GET', '/api/rounds')).json.find((r: any) => r.id === round.id);
  assert.equal(listed.status, 'sold out'); assert.equal(listed.availableTables, 0); assert.equal(listed.tablesForSale, 2);
  const refreshed = await poll(late, round.id, map.etag as string);
  assert.equal(refreshed.status, 200); assert.deepEqual(refreshed.json.tables.map((t: any) => t.status), ['HELD', 'HELD']);
  for (const tableNumber of [1, 2]) assert.equal((await call(late, 'POST', '/api/bookings', { roundId: round.id, tableNumber })).status, 409, `table ${tableNumber}`);
  // a table that is not for sale never counts
  const { round: partly } = await publishedRound({ tablesNotForSale: [2] });
  await heldBooking(first, partly.id, 1);
  const partlyListed = (await call(late, 'GET', '/api/rounds')).json.find((r: any) => r.id === partly.id);
  assert.deepEqual([partlyListed.status, partlyListed.availableTables, partlyListed.tablesForSale], ['sold out', 0, 1]);
});

test('UC-01 AF-3 Table Just Taken by Another Customer', async () => {
  const { round } = await publishedRound();
  const somchai = customer('somchai'), malee = customer('malee');
  const first = await heldBooking(somchai, round.id, 1);
  const taken = await call(malee, 'POST', '/api/bookings', { roundId: round.id, tableNumber: 1 });
  assert.equal(taken.status, 409, 'first lock wins (BRULE-03)');
  assert.equal(taken.json.error, 'the table has just been taken by another customer');
  // step 1: the refreshed map shows the table held by the first booking; the second customer has no booking
  const table1 = await tableStatus(malee, round.id, 1);
  assert.equal(table1.status, 'HELD'); assert.equal(table1.bookingId, first.id);
  assert.deepEqual((await call(malee, 'GET', '/api/customers/me/bookings')).json, []);
  assert.equal((await call(manager, 'GET', `/api/rounds/${round.id}/bookings`)).json.length, 1);
  // step 2: back at {View the Zone Map}, another table can be held
  const other = await call(malee, 'POST', '/api/bookings', { roundId: round.id, tableNumber: 2 });
  assert.equal(other.status, 200); assert.equal(other.json.tableNumber, 2);
  // a table that is not in the round, or not for sale, cannot be held either
  assert.equal((await call(malee, 'POST', '/api/bookings', { roundId: round.id, tableNumber: 9 })).status, 404);
});

test('UC-01 AF-4 Customer Cancels During the Hold', async () => {
  const { round } = await publishedRound();
  const somchai = customer('somchai');
  const held = await heldBooking(somchai, round.id, 1);
  await call(somchai, 'PUT', `/api/bookings/${held.id}/party-size`, { partySize: 4 });   // somewhere between {Hold the Table} and {Payment Verified}
  const before = await poll(somchai, round.id);
  const cancelled = await call(somchai, 'POST', `/api/bookings/${held.id}/cancel`);
  assert.equal(cancelled.status, 200); assert.equal(cancelled.json.status, 'Cancelled'); assert.equal(cancelled.json.remainingHoldSeconds, 0);
  assert.deepEqual(cancelled.json.history.map((h: any) => [h.status, h.by]), [['Held', somchai['x-user-id']], ['Cancelled', somchai['x-user-id']]]);
  // step 1: the hold is released immediately: the table is available again and the map has moved on
  const after = await poll(somchai, round.id, before.etag as string);
  assert.equal(after.status, 200); assert.equal(after.json.tables[0].status, 'AVAILABLE'); assert.equal(after.json.tables[0].bookingId, '');
  assert.equal((await call(somchai, 'GET', `/api/bookings/${held.id}`)).json.status, 'Cancelled');
  // step 2: the use case ends: nothing more can be done with the booking; another customer may take the table
  assert.equal((await call(somchai, 'POST', `/api/bookings/${held.id}/cancel`)).status, 409);
  assert.equal((await call(somchai, 'PUT', `/api/bookings/${held.id}/party-size`, { partySize: 2 })).status, 409);
  assert.equal((await call(somchai, 'POST', `/api/bookings/${held.id}/terms-acceptance`)).status, 409);
  assert.equal((await call(customer('malee'), 'POST', '/api/bookings', { roundId: round.id, tableNumber: 1 })).status, 200);
  assert.equal((await call(somchai, 'POST', '/api/bookings', { roundId: round.id, tableNumber: 1 })).status, 409, 'and then it is taken');
});

test('UC-01 AF-5 Profile Not Completed', async () => {
  const { round } = await publishedRound();
  const somchai = customer('somchai');
  const held = await heldBooking(somchai, round.id, 1);
  await call(somchai, 'PUT', `/api/bookings/${held.id}/party-size`, { partySize: 2 });
  // {Profile Complete}: UC-09 ended without a profile because the consent was declined (UC-09 AF-1)
  const refused = await call(somchai, 'POST', '/api/customers/me', { name: 'Somchai', phone: '0812345678', consent: false });
  assert.equal(refused.status, 400); assert.equal(refused.json.error, 'the booking cannot continue without consent to the data collection');
  assert.equal((await call(somchai, 'GET', '/api/customers/me')).status, 404, 'nothing was stored');
  assert.equal((await call(somchai, 'GET', `/api/bookings/${held.id}`)).json.status, 'Held', 'the refusal alone changes nothing: the web app cancels');
  // step 1: the booking cannot continue: the web app cancels it, the hold is released
  const cancelled = await call(somchai, 'POST', `/api/bookings/${held.id}/cancel`);
  assert.equal(cancelled.status, 200); assert.equal(cancelled.json.status, 'Cancelled');
  assert.equal((await tableStatus(somchai, round.id, 1)).status, 'AVAILABLE');
});

test('UC-01 EF-1 Hold Expires Before Payment', inProcessOnly('the hold-expiry job runs here with a clock 14 and 16 minutes ahead'), async () => {
  const { round } = await publishedRound();
  const somchai = customer('somchai');
  const held = await heldBooking(somchai, round.id, 1);
  await call(somchai, 'PUT', `/api/bookings/${held.id}/party-size`, { partySize: 2 });
  const before = await poll(somchai, round.id);
  assert.equal(before.json.tables[0].status, 'HELD'); assert.equal(before.json.tables[0].holdEndsAt, held.holdEndsAt);
  // the Time actor: the hold-expiry job of the Booking Service (ADR-08), run with a clock 14 and then 16 minutes ahead
  assert.equal((await expireUnpaidBookings(Date.now() + 14 * 60_000)).includes(held.id), false, 'the hold lasts the full 15 minutes');
  assert.equal((await call(somchai, 'GET', `/api/bookings/${held.id}`)).json.status, 'Held');
  assert.ok((await expireUnpaidBookings(Date.now() + 16 * 60_000)).includes(held.id));
  // step 1: the booking is Expired, the table released, the map refreshed for every customer
  const expired = await call(somchai, 'GET', `/api/bookings/${held.id}`);
  assert.equal(expired.json.status, 'Expired'); assert.equal(expired.json.remainingHoldSeconds, 0);
  assert.deepEqual(expired.json.history.map((h: any) => [h.status, h.by]), [['Held', somchai['x-user-id']], ['Expired', 'hold-expiry job']]);
  const after = await poll(customer('anyone'), round.id, before.etag as string);
  assert.equal(after.status, 200); assert.equal(after.json.tables[0].status, 'AVAILABLE'); assert.equal(after.json.tables[0].bookingId, ''); assert.equal(after.json.tables[0].holdEndsAt, '');
  // step 2 is the LINE notice (progress 2); step 3: the expired booking cannot continue, the table may be selected again
  assert.equal((await call(somchai, 'POST', `/api/bookings/${held.id}/terms-acceptance`)).status, 409);
  assert.equal((await call(somchai, 'POST', `/api/bookings/${held.id}/cancel`)).status, 409, 'an Expired booking is not Cancelled');
  const again = await call(somchai, 'POST', '/api/bookings', { roundId: round.id, tableNumber: 1 });
  assert.equal(again.status, 200); assert.notEqual(again.json.id, held.id); assert.equal(again.json.status, 'Held');
  const twice = await expireUnpaidBookings(Date.now() + 16 * 60_000);
  assert.ok(twice.includes(again.json.id)); assert.equal(twice.includes(held.id), false, 'the job is idempotent: a booking is not expired twice');
});

test('UC-01 EF-2 LINE Login Fails or Is Cancelled', async () => {
  // {LINE Login Result}: without an identity the gateway answers 401 on every route of the web app: the contract of a failed login
  const attempts: { method: 'GET' | 'POST'; path: string; body?: unknown }[] = [
    { method: 'GET', path: '/api/rounds' }, { method: 'POST', path: '/api/bookings', body: { roundId: 'r', tableNumber: 1 } }, { method: 'GET', path: '/api/customers/me' }, { method: 'GET', path: '/api/customers/me/bookings' },
  ];
  for (const { method, path, body } of attempts) {
    const r = await call(anonymous, method, path, body);
    assert.equal(r.status, 401, `${method} ${path}`); assert.match(r.json.error, /x-user-id and x-role/);
  }
  assert.equal((await call({ 'x-user-id': 'U-half', 'content-type': 'application/json' }, 'GET', '/api/rounds')).status, 401, 'an id without a role is no identity');
  assert.equal((await call({ 'x-role': 'customer', 'content-type': 'application/json' }, 'GET', '/api/rounds')).status, 401, 'a role without an id is no identity');
  // step 1: no booking was created; a signed-in customer sees nothing of it
  const { round } = await publishedRound();
  assert.equal((await call(anonymous, 'POST', '/api/bookings', { roundId: round.id, tableNumber: 1 })).status, 401);
  assert.equal((await tableStatus(customer('somchai'), round.id, 1)).status, 'AVAILABLE');
  assert.deepEqual((await call(manager, 'GET', `/api/rounds/${round.id}/bookings`)).json, []);
});

test.todo('UC-01 EF-3 Confirmation Message Cannot Be Sent: Notification Service not wired (no confirmation is sent before the Payment Service confirms a booking, progress 2)');
