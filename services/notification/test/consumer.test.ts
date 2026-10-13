// Unit test of api/consumer.ts: the hold-expiry event of the Booking Service (UC-01 EF-1), consumed over the message
// broker and turned into the same HoldExpiredNotice sendHoldExpiredNotice would send. The broker contract itself
// (delivery, ordering, RabbitMQ) is @seats/messaging's own test; this one only checks the wiring, over the in-process
// broker this test file's process shares (no RABBITMQ_URL in the test environment).
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { QUEUES, type HoldExpiredEvent } from '@seats/messaging/src/index.js';
import { resetStore, wire } from '../src/infrastructure/index.js';
import { adapters, LoggingLineMessaging } from '../src/infrastructure/adapters.js';
import { broker } from '../src/infrastructure/broker.js';
import { startConsumers } from '../src/api/consumer.js';
import { messages } from '../src/infrastructure/repositories.js';

wire();
await startConsumers();   // registers the queue's handler once; beforeEach only resets the store and the LINE fake

const EVENT: HoldExpiredEvent = { bookingId: 'b1', customerId: 'U-somchai', roundId: 'r1', roundName: 'Friday Live', tableNumber: 5 };
let line: LoggingLineMessaging;

beforeEach(async () => {
  await resetStore();
  line = new LoggingLineMessaging();
  adapters.lineMessaging = line;
});

describe('startConsumers: booking.hold-expired', () => {
  test('a published event becomes a HoldExpiredNotice: one push, stored with the booking and round named', async () => {
    await broker.publish(QUEUES.bookingHoldExpired, EVENT);
    await new Promise((r) => setTimeout(r, 20));   // the handler runs asynchronously off the publish
    assert.deepEqual(line.pushed.map((p) => [p.userId, p.kind]), [['U-somchai', 'HoldExpiredNotice']]);
    const [stored] = await messages.all();
    assert.deepEqual([stored?.kind, stored?.customerId, stored?.bookingId, stored?.delivered], ['HoldExpiredNotice', 'U-somchai', 'b1', true]);
    assert.match(stored?.text ?? '', /table 5 for Friday Live has expired/);
  });

  test('the LINE push fails: the message is kept undelivered, not thrown back at the broker', async () => {
    line.failNext = 1;
    await broker.publish(QUEUES.bookingHoldExpired, { ...EVENT, bookingId: 'b2' });
    await new Promise((r) => setTimeout(r, 20));
    const [stored] = await messages.all();
    assert.deepEqual([stored?.delivered, stored?.attempts], [false, 1]);
  });
});
