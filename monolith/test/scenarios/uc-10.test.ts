// UC-10 Pay the Full Table Fee (project document, Table 2.7; Appendix A, Table A.7). Payment is progress 2: the
// Booking Service's startPayment() answers 501 and the Payment Service is not wired to it, so every flow of the MVP
// is a todo. The one test below pins the preconditions of the use case and the progress 1 contract of the routes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anonymous, call, customer, heldBooking, publishedRound } from './harness.js';

test.todo('UC-10 basic flow Pay the Full Table Fee: payment is progress 2 (startPayment() answers 501; the Payment Service is not wired to the Booking Service)');
test.todo('UC-10 AF-1 Payment Declined: payment is progress 2 (no payment request can be created, so the simulated gateway has nothing to decline)');
test.todo('UC-10 EF-4 Hold Expires During Payment: payment is progress 2 (the expiry itself is UC-01 EF-1, asserted in uc-01.test.ts)');

test('UC-10 (progress 1) startPayment() needs the party size, the fee and the accepted terms, then answers 501', async () => {
  const { round } = await publishedRound();
  const somchai = customer('somchai');
  const held = await heldBooking(somchai, round.id, 1);
  // the preconditions: the booking is Held with its party size, its full table fee and the accepted terms (UC-01 steps 7 to 14)
  const tooEarly = await call(somchai, 'POST', `/api/bookings/${held.id}/payment`);
  assert.equal(tooEarly.status, 409); assert.match(tooEarly.json.error, /party size, fee and accepted terms/);
  await call(somchai, 'PUT', `/api/bookings/${held.id}/party-size`, { partySize: 2 });
  assert.equal((await call(somchai, 'POST', `/api/bookings/${held.id}/payment`)).status, 409, 'the terms are not accepted yet (BRULE-16)');
  await call(somchai, 'POST', `/api/bookings/${held.id}/terms-acceptance`);
  // steps 1–2: the payment request: not built yet
  const started = await call(somchai, 'POST', `/api/bookings/${held.id}/payment`);
  assert.equal(started.status, 501); assert.match(started.json.error, /progress 2/);
  assert.equal((await call(customer('malee'), 'POST', `/api/bookings/${held.id}/payment`)).status, 404, 'own bookings only');
  // steps 5–6: the signed webhook of the simulated gateway is routed (ADR-11) but knows no payment request yet
  const webhook = await call(anonymous, 'POST', '/api/payments/webhook', { paymentId: 'p-none', status: 'Paid', amount: 7200, signature: 'sim-p-none' });
  assert.equal(webhook.status, 404);
  assert.equal((await call(somchai, 'GET', '/api/payments/p-none')).status, 404);
  const unchanged = await call(somchai, 'GET', `/api/bookings/${held.id}`);
  assert.equal(unchanged.json.status, 'Held'); assert.ok(unchanged.json.remainingHoldSeconds > 0, 'no payment: the hold is unchanged');
});
