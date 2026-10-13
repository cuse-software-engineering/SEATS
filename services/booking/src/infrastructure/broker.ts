// The Booking Service's side of the message broker (@seats/messaging): the hold-expiry job's event (UC-01 EF-1,
// ADR-08) travels here instead of the job waiting on the Notification Service. One delegate per method, so a test
// that swaps `events.holdExpired` after wire() is followed, the same convention as infrastructure/clients.ts.
import { QUEUES, serviceBroker } from '@seats/messaging/src/index.js';
import type { HoldExpiredEvent } from '../domain/ports.js';

const broker = serviceBroker('booking');
export const connectBroker = (url?: string): Promise<void> => broker.connect(url);
export const disconnectBroker = (): Promise<void> => broker.close();

export const events = {
  holdExpired: (event: HoldExpiredEvent): Promise<void> => broker.publish(QUEUES.bookingHoldExpired, event),
};
