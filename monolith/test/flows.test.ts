// End-to-end tests of the two Deliverable 3 flows through the API Gateway with the six services in this process
// (ADR-14): no ports but an ephemeral one for the gateway, no containers, the messages still through the Protocol
// Buffers serializers. The smoke test (demo/smoke.mjs) runs the same flow against the seven processes over gRPC.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { wireMonolith } from '../src/wire.js';
import { resetStore as resetRounds } from '@seats/concert-round/src/store.js';
import { resetStore as resetTables } from '@seats/table-availability/src/store.js';
import { resetStore as resetBookings } from '@seats/booking/src/store.js';

wireMonolith();
const { createApp } = await import('@seats/gateway/src/app.js');
const server = createApp().listen(0);
const G = () => `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
after(() => server.close());
before(() => { resetRounds(); resetTables(); resetBookings(); });

type Headers = Record<string, string>;
const H = (userId: string, role: string): Headers => ({ 'x-user-id': userId, 'x-role': role, 'content-type': 'application/json' });
const manager = H('manager-nok', 'manager'), somchai = H('U-somchai', 'customer'), malee = H('U-malee', 'customer');
async function call(headers: Headers, method: string, path: string, body?: unknown): Promise<{ status: number; json: any; etag: string | null }> {
  const r = await fetch(G() + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, json: r.status === 304 ? null : await r.json().catch(() => null), etag: r.headers.get('etag') };
}
const day = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
const at = (h: string) => `${day}T${h}:00:00Z`;
let mapId = '', roundId = '', bookingId = '';

test('Create Zone Map and Create Round through the gateway, all in one process', async () => {
  assert.equal((await call(manager, 'PUT', '/api/table-types/round2', { name: '2-person round table', capacity: 2 })).status, 200);
  assert.equal((await call(manager, 'PUT', '/api/table-types/sofa6', { name: '6-person sofa', capacity: 6 })).status, 200);
  const map = await call(manager, 'POST', '/api/zone-maps', { name: 'Main hall' });
  assert.equal(map.status, 200); assert.equal(map.json.status, 'Draft'); mapId = map.json.id;
  const empty = await call(manager, 'POST', `/api/zone-maps/${mapId}/validate`);
  assert.equal(empty.json.valid, false);
  const activateInvalid = await call(manager, 'POST', `/api/zone-maps/${mapId}/activate`);
  assert.equal(activateInvalid.status, 400); assert.ok(Array.isArray(activateInvalid.json.details), 'the problems travel as details');
  const updated = await call(manager, 'PUT', `/api/zone-maps/${mapId}`, { zones: [{ id: 'A', name: 'Zone A' }], tables: [{ tableNumber: 1, zoneId: 'A', tableTypeId: 'sofa6', capacity: 6 }, { tableNumber: 2, zoneId: 'A', tableTypeId: 'round2', capacity: 2 }] });
  assert.equal(updated.status, 200); assert.deepEqual(updated.json.summary, [{ zoneId: 'A', name: 'Zone A', tables: 2, capacity: 8 }]);
  assert.equal((await call(manager, 'POST', `/api/zone-maps/${mapId}/activate`)).json.status, 'Active');
  assert.equal((await call(manager, 'DELETE', `/api/zone-maps/${mapId}`)).status, 409);
  const round = await call(manager, 'POST', '/api/rounds', { name: 'Friday Live' });
  assert.equal(round.status, 200); roundId = round.json.id;
  assert.equal(round.json.checkInWindow, null, 'an absent message is null after the round trip');
  assert.equal(round.json.artist, '', 'an absent string is empty after the round trip');
  assert.equal('confirmedBookings' in round.json, false, 'an absent optional field stays absent');
  assert.equal((await call(manager, 'POST', `/api/rounds/${roundId}/publish`)).status, 400);
  const details = await call(manager, 'PUT', `/api/rounds/${roundId}`, { artist: 'The Band', date: day, doorsOpenAt: at('18'), startAt: at('20'), bookingOpenAt: new Date(Date.now() - 60e3).toISOString(), zoneMapId: mapId, prices: [{ zoneId: 'A', tableTypeId: 'sofa6', packagePrice: 7200 }, { zoneId: 'A', tableTypeId: 'round2', packagePrice: 2400 }] });
  assert.equal(details.status, 200); assert.equal(details.json.checkInWindow.graceEndsAt, `${day}T20:30:00.000Z`);
  const published = await call(manager, 'POST', `/api/rounds/${roundId}/publish`);
  assert.equal(published.json.status, 'Published'); assert.equal(published.json.parameters.holdPeriodMinutes, 15);
  assert.equal((await call(manager, 'POST', `/api/rounds/${roundId}/publish`)).status, 200, 'publish is idempotent');
  assert.equal((await call(somchai, 'POST', `/api/rounds/${roundId}/publish`)).status, 403, 'a customer may not publish');
  const rounds = await call(somchai, 'GET', '/api/rounds');
  assert.equal(rounds.json.find((r: any) => r.id === roundId)?.status, 'open');
});

test('Create Booking: the polled map, first lock wins, the fee, the profile, the terms, cancel', async () => {
  const status = await call(somchai, 'GET', `/api/rounds/${roundId}/table-status`);
  assert.equal(status.status, 200); assert.equal(status.etag, String(status.json.version));
  const again = await fetch(`${G()}/api/rounds/${roundId}/table-status`, { headers: { ...somchai, 'if-none-match': status.etag as string } });
  assert.equal(again.status, 304);
  const held = await call(somchai, 'POST', '/api/bookings', { roundId, tableNumber: 1 });
  assert.equal(held.status, 200); assert.equal(held.json.status, 'Held'); assert.ok(held.json.remainingHoldSeconds > 0); bookingId = held.json.id;
  const taken = await call(malee, 'POST', '/api/bookings', { roundId, tableNumber: 1 });
  assert.equal(taken.status, 409, 'first lock wins');
  const fee = await call(somchai, 'PUT', `/api/bookings/${bookingId}/party-size`, { partySize: 7 });
  assert.equal(fee.json.fee.fullTableFee, 7800);
  assert.equal((await call(malee, 'GET', `/api/bookings/${bookingId}`)).status, 404, 'own bookings only');
  assert.equal((await call(somchai, 'GET', '/api/customers/me')).status, 404);
  assert.equal((await call(somchai, 'POST', '/api/customers/me', { name: 'Somchai', phone: '0812345678', consent: true })).status, 200);
  const terms = await call(somchai, 'GET', `/api/bookings/${bookingId}/terms`);
  assert.equal(terms.json.terms.length, 4);
  assert.equal((await call(somchai, 'POST', `/api/bookings/${bookingId}/terms-acceptance`)).json.termsAccepted, true);
  assert.equal((await call(somchai, 'POST', `/api/bookings/${bookingId}/payment`)).status, 501);
  const cancelled = await call(somchai, 'POST', `/api/bookings/${bookingId}/cancel`);
  assert.equal(cancelled.json.status, 'Cancelled'); assert.equal(cancelled.json.history.at(-1).by, 'U-somchai');
  const after_ = await call(somchai, 'GET', `/api/rounds/${roundId}/table-status`);
  assert.equal(after_.json.tables[0].status, 'AVAILABLE');
  assert.equal((await call(malee, 'POST', '/api/bookings', { roundId, tableNumber: 1 })).status, 200, 'free again');
  const live = await call(manager, 'GET', `/api/rounds/${roundId}/bookings`);
  assert.equal(live.json.length, 2);
});

test('staff sign-in, staff accounts and the payment webhook', async () => {
  const session = await call(H('', ''), 'POST', '/api/sessions', { username: 'manager', password: 'manager' });
  assert.equal(session.status, 200); assert.equal(session.json.role, 'manager');
  assert.equal((await call(H('', ''), 'POST', '/api/sessions', { username: 'manager', password: 'wrong' })).status, 401);
  const accounts = await call(manager, 'GET', '/api/staff-accounts');
  assert.equal(accounts.json.length, 3);
  assert.equal((await call(somchai, 'GET', '/api/staff-accounts')).status, 403);
  assert.equal((await call(H('', ''), 'POST', '/api/payments/webhook', { paymentId: 'p-x', status: 'Paid', amount: 1, signature: 'sim-p-x' })).status, 404);
  assert.equal((await call(H('', ''), 'GET', '/api/nothing')).status, 404);
  assert.equal((await call(H('', ''), 'GET', '/api/rounds')).status, 401);
  const health = await call(H('', ''), 'GET', '/health');
  assert.equal(health.json.ok, true); assert.equal(health.json.services.length, 6);
});
