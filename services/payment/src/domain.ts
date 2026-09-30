// Payment Service — one function per operation of its API. No transport code here. The Payment Gateway is
// simulated in progress 1 (ADR-11): the checkout URL is fake and the result's signature is "sim-" + the payment id.
import { randomUUID } from 'node:crypto';
import { collection } from './store.js';
import type { Payment, PaymentStatusValue } from './model.js';

export class DomainError extends Error {
  constructor(public readonly status: 400 | 404 | 409 | 501, message: string, public readonly details?: unknown) { super(message); }
}

const payments = collection<Payment>('payments');
const iso = (d: number) => new Date(d).toISOString();
const RESULTS: PaymentStatusValue[] = ['Paid', 'Failed'];

function requirePayment(paymentId: string): Payment {
  const p = payments.get(paymentId);
  if (!p) throw new DomainError(404, `payment ${paymentId} not found`);
  return p;
}

/** C — startPayment() of the Booking Service (UC-01 step 15): a Pending payment and the checkout URL to redirect to. */
export function createPaymentRequest({ bookingId, amount, customerId }: { bookingId?: string; amount?: number; customerId?: string }): { paymentId: string; checkoutUrl: string } {
  if (!bookingId || !customerId) throw new DomainError(400, 'bookingId and customerId are required');
  if (!Number.isInteger(amount) || (amount as number) < 1) throw new DomainError(400, 'amount must be a whole number of THB of at least 1');
  const paymentId = randomUUID();
  const checkoutUrl = `https://checkout.example/pay/${paymentId}`;                                 // the simulated Payment Gateway (ADR-11)
  payments.put(paymentId, { paymentId, bookingId, customerId, amount: amount as number, status: 'Pending', checkoutUrl, createdAt: iso(Date.now()), resultAt: '' });
  return { paymentId, checkoutUrl };
}

/** U — the webhook of the Payment Gateway (UC-10). Verified, then recorded once: a duplicate result is acknowledged and ignored. */
export function receivePaymentResult({ paymentId, status, amount, signature }: { paymentId?: string; status?: string; amount?: number; signature?: string }): { accepted: boolean } {
  if (!paymentId) throw new DomainError(400, 'paymentId is required');
  const p = requirePayment(paymentId);
  if (signature !== `sim-${paymentId}`) throw new DomainError(400, 'the signature of the payment result is not valid');
  if (!RESULTS.includes(status as PaymentStatusValue)) throw new DomainError(400, `status must be ${RESULTS.join(' or ')}`);
  if (amount !== p.amount) throw new DomainError(409, `the amount ${amount} does not match the requested ${p.amount}`);
  if (p.status !== 'Pending') return { accepted: true };                                          // already recorded (the gateway retried)
  p.status = status as PaymentStatusValue;
  p.resultAt = iso(Date.now());
  payments.put(paymentId, p);                                                                    // progress 2: gRPC ConfirmBookingPayment / SendPaymentFailedNotice
  return { accepted: true };
}

/** R — the customer's payment page polls it (UC-10). */
export function getPaymentStatus({ paymentId }: { paymentId?: string }): { paymentId: string; bookingId: string; status: PaymentStatusValue; amount: number } {
  const p = requirePayment(paymentId ?? '');
  return { paymentId: p.paymentId, bookingId: p.bookingId, status: p.status, amount: p.amount };
}
