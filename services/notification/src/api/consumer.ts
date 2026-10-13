// Message-broker transport of the Notification Service (grpc.ts is the gRPC one): the Booking Service's hold-expiry
// event becomes the same HoldExpiredNotice SendHoldExpiredNotice would (sendHoldExpiredNotice of domain/messages.ts),
// but the Booking Service does not call in and does not wait on the outcome or see a failure of the notification.
import { QUEUES, type HoldExpiredEvent } from '@seats/messaging/src/index.js';
import { broker } from '../infrastructure/broker.js';
import { sendHoldExpiredNotice } from '../domain/index.js';

/** Registers the hold-expiry consumer; call once, after wire(). A failure (the LINE port down, the database down)
 *  rejects: the broker requeues the event over RabbitMQ for another attempt (the in-process broker has none). */
export function startConsumers(): Promise<void> {
  return broker.consume<HoldExpiredEvent>(QUEUES.bookingHoldExpired, async (event) => {
    console.log(`[notification] hold-expired event: booking ${event.bookingId}, table ${event.tableNumber}`);
    await sendHoldExpiredNotice({ customerId: event.customerId, bookingId: event.bookingId, roundName: event.roundName, tableNumber: event.tableNumber });
  });
}
