// UC-09 Maintain Customer Profile (project document, Table 2.6; Appendix A, Table A.6): one test per flow, driven
// through the routes the Customer Web App calls (Appendix D, screen C5 and My Bookings).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { call, customer, heldBooking, publishedRound } from './harness.js';

const PHONE_RULE = 'phone must be a Thai mobile number (10 digits starting with 06, 08 or 09)';

test('UC-09 basic flow Maintain Customer Profile', async () => {
  const somchai = customer('somchai');
  // steps 1–2: {Profile Found}: no profile for this LINE user id yet
  const none = await call(somchai, 'GET', '/api/customers/me');
  assert.equal(none.status, 404); assert.match(none.json.error, /no profile yet/);
  // steps 3–5: the consent, the name and the phone; stored with the time of consent (BRULE-11)
  const before = Date.now();
  const created = await call(somchai, 'POST', '/api/customers/me', { name: ' Somchai Jaidee ', phone: '0812345678', consent: true });
  assert.equal(created.status, 200);
  assert.equal(created.json.customerId, somchai['x-user-id'], 'tied to the LINE user id (BRULE-12)');
  assert.equal(created.json.name, 'Somchai Jaidee'); assert.equal(created.json.phone, '0812345678');
  assert.ok(new Date(created.json.consentAt).getTime() >= before - 1000 && new Date(created.json.consentAt).getTime() <= Date.now() + 1000);
  // steps 6–7 (the next booking, or My Bookings): the stored name and phone shown, then corrected
  const found = await call(somchai, 'GET', '/api/customers/me');
  assert.equal(found.status, 200); assert.deepEqual(found.json, created.json);
  const corrected = await call(somchai, 'PUT', '/api/customers/me', { phone: '0898765432' });
  assert.equal(corrected.status, 200); assert.equal(corrected.json.phone, '0898765432'); assert.equal(corrected.json.name, 'Somchai Jaidee');
  assert.equal(corrected.json.consentAt, created.json.consentAt, 'the consent is given once');
  assert.deepEqual((await call(somchai, 'GET', '/api/customers/me')).json, corrected.json);
  assert.equal((await call(somchai, 'PUT', '/api/customers/me', {})).status, 200, 'confirmed as it is');
  // one LINE account is one customer (BRULE-12): another user has no profile; a profile is created once
  assert.equal((await call(customer('malee'), 'GET', '/api/customers/me')).status, 404);
  const again = await call(somchai, 'POST', '/api/customers/me', { name: 'Somchai', phone: '0812345678', consent: true });
  assert.equal(again.status, 409); assert.match(again.json.error, /profile exists/);
});

test('UC-09 AF-1 Consent Refused', async () => {
  const somchai = customer('somchai');
  const refused = await call(somchai, 'POST', '/api/customers/me', { name: 'Somchai', phone: '0812345678', consent: false });
  assert.equal(refused.status, 400); assert.equal(refused.json.error, 'the booking cannot continue without consent to the data collection');
  assert.equal((await call(somchai, 'POST', '/api/customers/me', { name: 'Somchai', phone: '0812345678' })).status, 400, 'no answer is no consent');
  // step 1: nothing is stored
  assert.equal((await call(somchai, 'GET', '/api/customers/me')).status, 404);
  assert.equal((await call(somchai, 'PUT', '/api/customers/me', { name: 'Somchai' })).status, 404, 'there is no profile to correct');
  // step 2: the use case ends without a profile; the Customer may consent later
  assert.equal((await call(somchai, 'POST', '/api/customers/me', { name: 'Somchai', phone: '0812345678', consent: true })).status, 200);
});

test('UC-09 AF-2 Invalid Profile Data', async () => {
  const { round } = await publishedRound();
  const somchai = customer('somchai');
  const held = await heldBooking(somchai, round.id, 1);   // UC-01 in progress: the hold timer is running
  // {Create the Profile}: an empty name and a phone that is no Thai mobile number
  const invalid = await call(somchai, 'POST', '/api/customers/me', { name: '  ', phone: '12345', consent: true });
  assert.equal(invalid.status, 400); assert.equal(invalid.json.error, 'invalid profile');
  assert.deepEqual(invalid.json.details, ['name is required', PHONE_RULE]);
  for (const phone of ['0512345678', '081234567', '+66812345678', '08123456789', '02-123-4567']) {
    const r = await call(somchai, 'POST', '/api/customers/me', { name: 'Somchai', phone, consent: true });
    assert.equal(r.status, 400, phone); assert.deepEqual(r.json.details, [PHONE_RULE], phone);
  }
  assert.equal((await call(somchai, 'GET', '/api/customers/me')).status, 404, 'nothing is stored until the correction');
  // step 1: the running hold keeps running
  const booking = await call(somchai, 'GET', `/api/bookings/${held.id}`);
  assert.equal(booking.json.status, 'Held'); assert.ok(booking.json.remainingHoldSeconds > 0);
  // step 2: back at the same phase with the correction
  assert.equal((await call(somchai, 'POST', '/api/customers/me', { name: 'Somchai', phone: '0612345678', consent: true })).status, 200);
  // {Confirm the Profile}: a correction is validated the same way, and the stored profile is untouched by a refused one
  const bad = await call(somchai, 'PUT', '/api/customers/me', { phone: '0212345678' });
  assert.equal(bad.status, 400); assert.deepEqual(bad.json.details, [PHONE_RULE]);
  assert.deepEqual((await call(somchai, 'PUT', '/api/customers/me', { name: '' })).json.details, ['name is required']);
  const kept = await call(somchai, 'GET', '/api/customers/me');
  assert.equal(kept.json.name, 'Somchai'); assert.equal(kept.json.phone, '0612345678');
});

test.todo('UC-09 EF-1 Profile Cannot Be Saved: the in-memory store cannot fail');
