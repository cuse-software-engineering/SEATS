// Notification Service — one function per operation of its API, plus the retry job. No transport code here. The LINE
// Messaging API and the Notification DB are reached through the ports (ports.ts), bound by the infrastructure's wire();
// in progress 1 the LINE port is a fake that logs.
import { randomUUID } from 'node:crypto';
import { DomainError } from '@seats/errors/src/index.js';
import { ports } from './ports.js';
import type { Message, NotificationKind } from './model.js';

export interface NotificationRequest { customerId?: string; bookingId?: string; roundName?: string; tableNumber?: number }
export interface NotificationResult { messageId: string; delivered: boolean }

const MAX_ATTEMPTS = 3;   // FR-22: a failed message is retried three times within five minutes
const iso = (d: number) => new Date(d).toISOString();

const TEXT: Record<NotificationKind, (r: NotificationRequest) => string> = {
  BookingConfirmation: (r) => `Your table ${r.tableNumber} for ${r.roundName} is confirmed. Your e-ticket is in My Bookings.`,
  HoldExpiredNotice: (r) => `Your hold on table ${r.tableNumber} for ${r.roundName} has expired; the table is available again.`,
  PaymentFailedNotice: (r) => `The payment for table ${r.tableNumber} for ${r.roundName} failed; the table is still held for you.`,
};

/** One push through the LINE port; the record keeps the outcome for the retry job. */
async function attempt(m: Message): Promise<Message> {
  m.attempts += 1;
  try {
    await ports.lineMessaging.push({ userId: m.customerId, kind: m.kind, text: m.text });
    m.delivered = true; m.lastError = '';
  } catch (e) {
    m.delivered = false; m.lastError = e instanceof Error ? e.message : String(e);
    console.warn(`[notification] push ${m.messageId} failed (attempt ${m.attempts}): ${m.lastError}`);
  }
  return ports.messages.save(m);
}

async function send(kind: NotificationKind, req: NotificationRequest): Promise<NotificationResult> {
  if (!req.customerId || !req.bookingId || !req.roundName || !Number.isInteger(req.tableNumber)) throw new DomainError('invalid', 'customerId, bookingId, roundName and tableNumber are required');   // the text names the table and the round
  const m: Message = { messageId: randomUUID(), customerId: req.customerId, bookingId: req.bookingId, kind, text: TEXT[kind](req), delivered: false, attempts: 0, lastError: '', sentAt: iso(Date.now()) };
  await attempt(m);
  return { messageId: m.messageId, delivered: m.delivered };
}

/** UC-01 step 19: the booking is confirmed and the e-ticket issued. */
export const sendBookingConfirmation = (req: NotificationRequest): Promise<NotificationResult> => send('BookingConfirmation', req);
/** UC-01 EF-1: the hold expired unpaid (the Booking Service's expiry job, ADR-08). */
export const sendHoldExpiredNotice = (req: NotificationRequest): Promise<NotificationResult> => send('HoldExpiredNotice', req);
/** UC-10: the Payment Gateway reported a failure. */
export const sendPaymentFailedNotice = (req: NotificationRequest): Promise<NotificationResult> => send('PaymentFailedNotice', req);

/** The retry job (Table 5.3, FR-22, UC-01 EF-3): not an operation; the service runs it on its own timer. */
export async function retryFailedMessages(): Promise<string[]> {
  const retried: string[] = [];
  for (const m of (await ports.messages.undelivered()).filter((x) => x.attempts < MAX_ATTEMPTS)) {
    await attempt(m);
    retried.push(m.messageId);
  }
  return retried;
}

/** For the tests and the live view of a message. */
export const getMessage = (messageId: string): Promise<Message | null> => ports.messages.get(messageId);
