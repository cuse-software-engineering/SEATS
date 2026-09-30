// UC-02 Check In with E-Ticket (project document, Table 2.3; Appendix A, Table A.3). Check-in is progress 2:
// verifyBookingReference() and checkInBooking() answer 501, and no booking can be Confirmed before the Payment Service
// is wired, so every flow of the MVP is a todo. The one test below pins the progress 1 contract of the routes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { call, customer, frontStaff, heldBooking, manager, publishedRound } from './harness.js';

test.todo('UC-02 basic flow Check In with E-Ticket: check-in answers 501 in progress 1 (verifyBookingReference() and checkInBooking() come in progress 2)');
test.todo('UC-02 S-1 Verify the Booking Reference: check-in answers 501 in progress 1 (no e-ticket is issued before the Payment Service confirms a booking)');
test.todo('UC-02 AF-2 QR Code Unreadable: check-in answers 501 in progress 1 (a typed booking reference goes to the same verifyBookingReference())');
test.todo('UC-02 AF-3 Check-In Window Not Open Yet: check-in answers 501 in progress 1 (the window itself is derived: see UC-03 basic flow)');
test.todo('UC-02 AF-4 More Guests Than the Party Size Paid For: no operation of SEATS (extra guests are handled by hand, BRULE-09); check-in answers 501 in progress 1');
test.todo('UC-02 AF-5 Arrival After the Grace Period: check-in answers 501 in progress 1');
test.todo('UC-02 EF-1 Ticket Already Used: check-in answers 501 in progress 1');
test.todo('UC-02 EF-2 Ticket for Another Round or an Unknown Booking: check-in answers 501 in progress 1');
test.todo('UC-02 EF-5 Check-In Cannot Be Saved: the in-memory store cannot fail; check-in answers 501 in progress 1');

test('UC-02 (progress 1) the check-in routes answer 501 and keep their role check', async () => {
  const { round } = await publishedRound();
  const somchai = customer('somchai');
  const held = await heldBooking(somchai, round.id, 1);
  const verify = await call(frontStaff, 'POST', '/api/check-ins/verify', { bookingReference: `ref-${held.id}` });
  assert.equal(verify.status, 501); assert.match(verify.json.error, /progress 2/);
  assert.equal((await call(manager, 'POST', '/api/check-ins', { bookingReference: `ref-${held.id}` })).status, 501);
  assert.equal((await call(somchai, 'POST', '/api/check-ins/verify', { bookingReference: 'x' })).status, 403, 'a customer may not check in (FR-66)');
  assert.equal((await call(somchai, 'GET', `/api/bookings/${held.id}/e-ticket`)).status, 501, 'no e-ticket before the booking is Confirmed (progress 2)');
  // the live view of step 7 exists already: the bookings of the round for the management, the table map for every staff role
  assert.deepEqual((await call(manager, 'GET', `/api/rounds/${round.id}/bookings`)).json.map((b: any) => [b.tableNumber, b.status]), [[1, 'Held']]);
  assert.equal((await call(frontStaff, 'GET', `/api/rounds/${round.id}/bookings`)).status, 403, 'the list of bookings is for the manager and the owner');
  assert.equal((await call(frontStaff, 'GET', `/api/rounds/${round.id}/table-status`)).json.tables[0].status, 'HELD');
  assert.equal((await call(somchai, 'GET', `/api/bookings/${held.id}`)).json.status, 'Held', 'verification changes nothing');
});
