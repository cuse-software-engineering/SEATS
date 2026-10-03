// Payment Service — one function per operation of its API. No transport code here. The Payment Gateway and the Payment
// DB are reached through the ports (ports.ts): in progress 1 the gateway behind the port is the simulated one of
// ADR-11. A refusal is a DomainError of @seats/errors: the domain names the kind, the API layer maps it to a status.
import { randomUUID } from 'node:crypto';
import { DomainError } from '@seats/errors/src/index.js';
import { ports } from './ports.js';
import type { Payment, PaymentStatusValue } from './model.js';

const iso = (d: number) => new Date(d).toISOString();
const RESULTS: PaymentStatusValue[] = ['Paid', 'Failed'];

async function requirePayment(paymentId: string): Promise<Payment> {
  const p = await ports.payments.get(paymentId);
  if (!p) throw new DomainError('not_found', `payment ${paymentId} not found`);
  return p;
}

/** C — startPayment() of the Booking Service (UC-01 step 15): a Pending payment and the checkout URL to redirect to. */
export async function createPaymentRequest({ bookingId, amount, customerId }: { bookingId?: string; amount?: number; customerId?: string }): Promise<{ paymentId: string; checkoutUrl: string }> {
  if (!bookingId || !customerId) throw new DomainError('invalid', 'bookingId and customerId are required');
  if (!Number.isInteger(amount) || (amount as number) < 1) throw new DomainError('invalid', 'amount must be a whole number of THB of at least 1');
  const paymentId = randomUUID();
  const { checkoutUrl } = await ports.paymentGateway.createCheckout({ paymentId, amount: amount as number, customerId });   // the hosted checkout of the gateway
  await ports.payments.save({ paymentId, bookingId, customerId, amount: amount as number, status: 'Pending', checkoutUrl, createdAt: iso(Date.now()), resultAt: '' });
  return { paymentId, checkoutUrl };
}

/** U — the webhook of the Payment Gateway (UC-10). Verified, then recorded once: a duplicate result is acknowledged and ignored. */
export async function receivePaymentResult({ paymentId, status, amount, signature }: { paymentId?: string; status?: string; amount?: number; signature?: string }): Promise<{ accepted: boolean }> {
  if (!paymentId) throw new DomainError('invalid', 'paymentId is required');
  const p = await requirePayment(paymentId);
  if (!ports.paymentGateway.verifySignature({ paymentId, status: status ?? '', amount: amount ?? 0, signature: signature ?? '' })) throw new DomainError('invalid', 'the signature of the payment result is not valid');
  if (!RESULTS.includes(status as PaymentStatusValue)) throw new DomainError('invalid', `status must be ${RESULTS.join(' or ')}`);
  if (amount !== p.amount) throw new DomainError('conflict', `the amount ${amount} does not match the requested ${p.amount}`);
  if (p.status !== 'Pending') return { accepted: true };                                          // already recorded (the gateway retried)
  p.status = status as PaymentStatusValue;
  p.resultAt = iso(Date.now());
  await ports.payments.save(p);                                                                  // progress 2: gRPC ConfirmBookingPayment / SendPaymentFailedNotice
  return { accepted: true };
}

/** R — the customer's payment page polls it (UC-10). */
export async function getPaymentStatus({ paymentId }: { paymentId?: string }): Promise<{ paymentId: string; bookingId: string; status: PaymentStatusValue; amount: number }> {
  const p = await requirePayment(paymentId ?? '');
  return { paymentId: p.paymentId, bookingId: p.bookingId, status: p.status, amount: p.amount };
}
