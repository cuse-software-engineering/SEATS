// The Notification Service's side of the message broker (@seats/messaging): the consumer of the Booking Service's
// hold-expiry event (UC-01 EF-1, ADR-08). api/consumer.ts registers the handler; this module only owns the connection.
import { serviceBroker } from '@seats/messaging/src/index.js';

export const broker = serviceBroker('notification');
export const connectBroker = (url?: string): Promise<void> => broker.connect(url);
export const disconnectBroker = (): Promise<void> => broker.close();
