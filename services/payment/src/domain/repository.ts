// The repository of the Payment DB (ADR-06: one database per service) as the domain sees it: named after what the
// rules ask for, no rules here. infrastructure/repositories.ts implements it over the service's store; the rules
// reach it through ports.payments (ports.ts) and never import the implementation.
import type { Payment } from './model.js';

export interface PaymentRepository {
  /** The payment with this id, or null. */
  get(paymentId: string): Promise<Payment | null>;
  /** Inserts or replaces the payment under its id (a new request, or a result recorded on it). */
  save(p: Payment): Promise<void>;
}
