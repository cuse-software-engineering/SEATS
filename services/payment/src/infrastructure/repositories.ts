// The repositories of the Payment DB (ADR-06: one database per service): the domain's PaymentRepository implemented
// over one Collection<Payment> of store.ts. No rules here; which store answers (memory or MongoDB) is chosen once, when
// the service starts. index.ts binds `payments` to the domain's port in wire().
import { collection } from './store.js';
import type { Payment } from '../domain/model.js';
import type { PaymentRepository } from '../domain/repository.js';

const stored = collection<Payment>('payments');   // the one collection of this service; the handle is taken at module load

/** The repository in use. */
export const payments: PaymentRepository = {
  get: (paymentId) => stored.get(paymentId),
  save: async (p) => { await stored.put(p.paymentId, p); },
};
