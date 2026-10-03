// First lock wins under concurrency (BRULE-03, NFR-20, ADR-13): many customers hold the same table at the same moment
// through the gateway, exactly one gets the table. In-process the lock is the in-memory insert; over the network
// (`npm run test:api`) it is the same code on the configured store, so MONGO_URL proves the unique index does it too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { call, customer, manager, poll, publishedRound } from './harness.js';

const CUSTOMERS = 20;

test('NFR-20 first lock wins: 20 customers hold the same table at once, exactly one succeeds', async () => {
  const { round } = await publishedRound();
  const people = Array.from({ length: CUSTOMERS }, (_, i) => customer(`racer${i}`));
  const answers = await Promise.all(people.map((who) => call(who, 'POST', '/api/bookings', { roundId: round.id, tableNumber: 1 })));
  const won = answers.filter((a) => a.status === 200), lost = answers.filter((a) => a.status === 409);
  assert.equal(won.length, 1, `statuses: ${answers.map((a) => a.status).join(' ')}`);
  assert.equal(lost.length, CUSTOMERS - 1);
  for (const a of lost) assert.match(a.json.error, /just been taken by another customer/);
  // the table map and the round's bookings agree with the one winner
  const table = (await poll(people[0], round.id)).json.tables.find((t: any) => t.tableNumber === 1);
  assert.equal(table.status, 'HELD'); assert.equal(table.bookingId, won[0].json.id);
  const active = (await call(manager, 'GET', `/api/rounds/${round.id}/bookings`)).json.filter((b: any) => b.status === 'Held');
  assert.deepEqual(active.map((b: any) => b.id), [won[0].json.id]);
});

test('NFR-20 the losers are not blocked: the same 20 customers then hold table 2, again exactly one succeeds, and after the winner cancels the next one gets it', async () => {
  const { round } = await publishedRound();
  const people = Array.from({ length: CUSTOMERS }, (_, i) => customer(`again${i}`));
  const first = await Promise.all(people.map((who) => call(who, 'POST', '/api/bookings', { roundId: round.id, tableNumber: 2 })));
  const winner = first.findIndex((a) => a.status === 200);
  assert.equal(first.filter((a) => a.status === 200).length, 1);
  assert.equal((await call(people[winner], 'POST', `/api/bookings/${first[winner].json.id}/cancel`)).status, 200);
  const second = await Promise.all(people.map((who) => call(who, 'POST', '/api/bookings', { roundId: round.id, tableNumber: 2 })));
  assert.equal(second.filter((a) => a.status === 200).length, 1);
  assert.equal(second.filter((a) => a.status === 409).length, CUSTOMERS - 1);
});
