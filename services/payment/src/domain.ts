// Payment Service — one function per operation of its API. No transport code here. The Payment Gateway is reached
// through its adapter (adapters.ts); in progress 1 that is the simulated gateway of ADR-11.
import { randomUUID } from 'node:crypto';
import { collection } from './store.js';
import { adapters } from './adapters.js';
import type { Payment, PaymentStatusValue } from './model.js';

export class DomainError extends Error {
  constructor(public readonly status: 400 | 404 | 409 | 501, message: string, public readonly details?: unknown) { super(message); }
}

const payments = collection<Payment>('payments');
const iso = (d: number) => new Date(d).toISOString();
const RESULTS: PaymentStatusValue[] = ['Paid', 'Failed'];

async function requirePayment(paymentId: string): Promise<Payment> {
  const p = await payments.get(paymentId);
  if (!p) throw new DomainError(404, `payment ${paymentId} not found`);
  return p;
}

/** C — startPayment() of the Booking Service (UC-01 step 15): a Pending payment and the checkout URL to redirect to. */
export async function createPaymentRequest({ bookingId, amount, customerId }: { bookingId?: string; amount?: number; customerId?: string }): Promise<{ paymentId: string; checkoutUrl: string }> {
  if (!bookingId || !customerId) throw new DomainError(400, 'bookingId and customerId are required');
  if (!Number.isInteger(amount) || (amount as number) < 1) throw new DomainError(400, 'amount must be a whole number of THB of at least 1');
  const paymentId = randomUUID();
  const { checkoutUrl } = await adapters.paymentGateway.createCheckout({ paymentId, amount: amount as number, customerId });   // the hosted checkout of the gateway
  await payments.put(paymentId, { paymentId, bookingId, customerId, amount: amount as number, status: 'Pending', checkoutUrl, createdAt: iso(Date.now()), resultAt: '' });
  return { paymentId, checkoutUrl };
}

/** U — the webhook of the Payment Gateway (UC-10). Verified, then recorded once: a duplicate result is acknowledged and ignored. */
export async function receivePaymentResult({ paymentId, status, amount, signature }: { paymentId?: string; status?: string; amount?: number; signature?: string }): Promise<{ accepted: boolean }> {
  if (!paymentId) throw new DomainError(400, 'paymentId is required');
  const p = await requirePayment(paymentId);
  if (!adapters.paymentGateway.verifySignature({ paymentId, status: status ?? '', amount: amount ?? 0, signature: signature ?? '' })) throw new DomainError(400, 'the signature of the payment result is not valid');
  if (!RESULTS.includes(status as PaymentStatusValue)) throw new DomainError(400, `status must be ${RESULTS.join(' or ')}`);
  if (amount !== p.amount) throw new DomainError(409, `the amount ${amount} does not match the requested ${p.amount}`);
  if (p.status !== 'Pending') return { accepted: true };                                          // already recorded (the gateway retried)
  p.status = status as PaymentStatusValue;
  p.resultAt = iso(Date.now());
  await payments.put(paymentId, p);                                                              // progress 2: gRPC ConfirmBookingPayment / SendPaymentFailedNotice
  return { accepted: true };
}

/** R — the customer's payment page polls it (UC-10). */
export async function getPaymentStatus({ paymentId }: { paymentId?: string }): Promise<{ paymentId: string; bookingId: string; status: PaymentStatusValue; amount: number }> {
  const p = await requirePayment(paymentId ?? '');
  return { paymentId: p.paymentId, bookingId: p.bookingId, status: p.status, amount: p.amount };
}
