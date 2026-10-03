// Unit tests of the Notification Service domain: the LINE Messaging API behind its adapter (ADR-10), the fake that
// records each push, and the retry job of FR-22.
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain/index.js';
import { resetStore, wire } from '../src/infrastructure/index.js';
import { adapters, LoggingLineMessaging } from '../src/infrastructure/adapters.js';
import { messages } from '../src/infrastructure/repositories.js';
import type { DomainErrorKind } from '@seats/errors/src/index.js';

wire();   // binds the repositories and the LINE adapter to the domain's ports, once

const rejected = (p: Promise<unknown>, kind: DomainErrorKind) => assert.rejects(p, (e: unknown) => e instanceof d.DomainError && e.kind === kind);
const REQUEST = { customerId: 'U-somchai', bookingId: 'b1', roundName: 'Friday Live', tableNumber: 5 };
let line: LoggingLineMessaging;
const quiet = <T>(fn: () => Promise<T>): Promise<T> => { const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {}; return fn().finally(() => { console.log = log; console.warn = warn; }); };

beforeEach(async () => { await resetStore(); line = new LoggingLineMessaging(); adapters.lineMessaging = line; });

describe('the three notices', () => {
  test('each pushes one message through the adapter, records it and answers delivered', () => quiet(async () => {
    const senders = [['BookingConfirmation', d.sendBookingConfirmation], ['HoldExpiredNotice', d.sendHoldExpiredNotice], ['PaymentFailedNotice', d.sendPaymentFailedNotice]] as const;
    for (const [kind, send] of senders) {
      const r = await send(REQUEST);
      assert.equal(r.delivered, true);
      const m = await messages.get(r.messageId);
      assert.deepEqual([m?.kind, m?.customerId, m?.bookingId, m?.attempts, m?.lastError], [kind, 'U-somchai', 'b1', 1, '']);
      assert.ok(m?.text.includes('table 5') && m.text.includes('Friday Live'), m?.text);
    }
    assert.deepEqual(line.pushed.map((p) => [p.userId, p.kind]), [['U-somchai', 'BookingConfirmation'], ['U-somchai', 'HoldExpiredNotice'], ['U-somchai', 'PaymentFailedNotice']]);
  }));
  test('a notice needs the customer and the booking', () => quiet(async () => {
    await rejected(d.sendBookingConfirmation({ ...REQUEST, customerId: '' }), 'invalid');
    await rejected(d.sendHoldExpiredNotice({ ...REQUEST, bookingId: undefined }), 'invalid');
    assert.deepEqual([line.pushed, await messages.all()], [[], []]);
  }));
});

describe('when the LINE Messaging API refuses the message (UC-01 EF-3, FR-22)', () => {
  test('the notice is recorded as not delivered and the caller learns it', () => quiet(async () => {
    line.failNext = 1;
    const r = await d.sendBookingConfirmation(REQUEST);
    assert.equal(r.delivered, false);
    const m = await d.getMessage(r.messageId);
    assert.equal(m?.attempts, 1); assert.match(m?.lastError ?? '', /did not accept/);
  }));
  test('the retry job resends it and stops once delivered', () => quiet(async () => {
    line.failNext = 1;
    const r = await d.sendHoldExpiredNotice(REQUEST);
    assert.deepEqual(await d.retryFailedMessages(), [r.messageId]);
    const m = await d.getMessage(r.messageId);
    assert.equal(m?.delivered, true); assert.equal(m?.attempts, 2);
    assert.deepEqual(await d.retryFailedMessages(), [], 'nothing left to retry');
  }));
  test('the retry job gives up after three attempts', () => quiet(async () => {
    line.failNext = 10;
    const r = await d.sendPaymentFailedNotice(REQUEST);
    await d.retryFailedMessages(); await d.retryFailedMessages();
    assert.deepEqual(await d.retryFailedMessages(), [], 'the fourth push is never tried');
    const m = await d.getMessage(r.messageId);
    assert.deepEqual([m?.delivered, m?.attempts], [false, 3]);
    assert.equal(line.pushed.length, 0);
  }));
});
