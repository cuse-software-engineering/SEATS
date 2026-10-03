// Unit tests of domain/progress2.ts: the operations of UC-01 step 21 (the e-ticket) and UC-02 (the reference check,
// the check-in) that progress 2 builds. Each answers not_implemented naming itself, so the API layer maps it to
// UNIMPLEMENTED (501) and a client can tell it from a defect. No port is touched, so nothing is wired.
//  operation               | call | expected
//  getETicket              | ()   | throws DomainError not_implemented 'getETicket() is built in progress 2'
//  verifyBookingReference  | ()   | throws DomainError not_implemented naming verifyBookingReference()
//  checkInBooking          | ()   | throws DomainError not_implemented naming checkInBooking()
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain/index.js';

describe('progress 2 operations', () => {
  for (const [name, op] of [['getETicket', d.getETicket], ['verifyBookingReference', d.verifyBookingReference], ['checkInBooking', d.checkInBooking]] as const)
    test(`${name}: () -> throws not_implemented naming ${name}()`, () =>
      assert.throws(op, (e: unknown) => e instanceof d.DomainError && e.kind === 'not_implemented' && e.message === `${name}() is built in progress 2`));
});
