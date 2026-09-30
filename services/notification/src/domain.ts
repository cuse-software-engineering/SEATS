// Notification Service — one function per operation of its API. No transport code here. The LINE Messaging
// Adapter is a stub in progress 1: each notice is recorded and logged, never pushed.
import { randomUUID } from 'node:crypto';
import { collection } from './store.js';
import type { Message, NotificationKind } from './model.js';

export class DomainError extends Error {
  constructor(public readonly status: 400 | 404 | 409 | 501, message: string, public readonly details?: unknown) { super(message); }
}

export interface NotificationRequest { customerId?: string; bookingId?: string; roundName?: string; tableNumber?: number }
export interface NotificationResult { messageId: string; delivered: boolean }

const messages = collection<Message>('messages');
const iso = (d: number) => new Date(d).toISOString();

const TEXT: Record<NotificationKind, (r: NotificationRequest) => string> = {
  BookingConfirmation: (r) => `Your table ${r.tableNumber} for ${r.roundName} is confirmed. Your e-ticket is in My Bookings.`,
  HoldExpiredNotice: (r) => `Your hold on table ${r.tableNumber} for ${r.roundName} has expired; the table is available again.`,
  PaymentFailedNotice: (r) => `The payment for table ${r.tableNumber} for ${r.roundName} failed; the table is still held for you.`,
};

function send(kind: NotificationKind, req: NotificationRequest): NotificationResult {
  if (!req.customerId || !req.bookingId) throw new DomainError(400, 'customerId and bookingId are required');
  const m: Message = { messageId: randomUUID(), customerId: req.customerId, bookingId: req.bookingId, kind, text: TEXT[kind](req), delivered: true, sentAt: iso(Date.now()) };
  messages.put(m.messageId, m);
  console.log(`[notification] LINE push to ${m.customerId}: ${kind}`);                          // LINE Messaging Adapter stub
  return { messageId: m.messageId, delivered: m.delivered };
}

/** UC-01 step 20: the booking is confirmed and the e-ticket issued. */
export const sendBookingConfirmation = (req: NotificationRequest): NotificationResult => send('BookingConfirmation', req);
/** UC-01 EF-1: the hold expired unpaid (the Booking Service's expiry job, ADR-08). */
export const sendHoldExpiredNotice = (req: NotificationRequest): NotificationResult => send('HoldExpiredNotice', req);
/** UC-10: the Payment Gateway reported a failure. */
export const sendPaymentFailedNotice = (req: NotificationRequest): NotificationResult => send('PaymentFailedNotice', req);
