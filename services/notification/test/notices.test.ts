// Unit tests of the Notification Service domain: the LINE Messaging Adapter stub records and logs each notice.
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain.js';
import { collection, resetStore } from '../src/store.js';
import type { Message } from '../src/model.js';

const refused = (fn: () => unknown, status: number) => assert.throws(fn, (e: unknown) => e instanceof d.DomainError && e.status === status);
const REQUEST = { customerId: 'U-somchai', bookingId: 'b1', roundName: 'Friday Live', tableNumber: 5 };
const messages = collection<Message>('messages');
let logged: string[] = [];
const realLog = console.log;

beforeEach(() => { resetStore(); logged = []; console.log = (line: string) => { logged.push(line); }; });
const restore = () => { console.log = realLog; };

describe('the three notices', () => {
  test('each records the message, logs one LINE push line and answers delivered', () => {
    try {
      const senders = [['BookingConfirmation', d.sendBookingConfirmation], ['HoldExpiredNotice', d.sendHoldExpiredNotice], ['PaymentFailedNotice', d.sendPaymentFailedNotice]] as const;
      for (const [kind, send] of senders) {
        const r = send(REQUEST);
        assert.equal(r.delivered, true);
        const m = messages.get(r.messageId);
        assert.deepEqual([m?.kind, m?.customerId, m?.bookingId], [kind, 'U-somchai', 'b1']);
        assert.ok(m?.text.includes('table 5') && m.text.includes('Friday Live'), m?.text);
      }
      assert.deepEqual(logged, ['[notification] LINE push to U-somchai: BookingConfirmation', '[notification] LINE push to U-somchai: HoldExpiredNotice', '[notification] LINE push to U-somchai: PaymentFailedNotice']);
      assert.equal(messages.list().length, 3);
    } finally { restore(); }
  });
  test('a notice needs the customer and the booking', () => {
    try {
      refused(() => d.sendBookingConfirmation({ ...REQUEST, customerId: '' }), 400);
      refused(() => d.sendHoldExpiredNotice({ ...REQUEST, bookingId: undefined }), 400);
      assert.deepEqual([logged, messages.list()], [[], []]);
    } finally { restore(); }
  });
});
