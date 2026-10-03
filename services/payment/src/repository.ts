// The repository of the Payment DB (ADR-06: one database per service): the domain's view of its own data, named after
// what the domain asks for, implemented over one Collection<Payment> of store.ts. No rules here; which store answers
// (memory or MongoDB) is chosen once, when the service starts. The domain imports the `payments` object only.
import { collection } from './store.js';
import type { Payment } from './model.js';

export interface PaymentRepository {
  /** The payment with this id, or null. */
  get(paymentId: string): Promise<Payment | null>;
  /** Inserts or replaces the payment under its id (a new request, or a result recorded on it). */
  save(p: Payment): Promise<void>;
}

const stored = collection<Payment>('payments');   // the one collection of this service; repository.ts takes its handle at module load

/** The repository in use. */
export const payments: PaymentRepository = {
  get: (paymentId) => stored.get(paymentId),
  save: async (p) => { await stored.put(p.paymentId, p); },
};
