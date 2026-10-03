// The ports of the domain: what it needs from outside, as interfaces. infrastructure/index.ts binds the implementations
// (wire()); the rules call them through `ports` and never import the infrastructure.
import type { PaymentRepository } from './repository.js';

export interface CheckoutRequest { paymentId: string; amount: number; customerId: string }
export interface SignedResult { paymentId: string; status: string; amount: number; signature: string }

/** The Payment Gateway (Table 5.2; ADR-11: simulated in the MVP so that the real one can replace it behind this port). */
export interface PaymentGateway {
  /** Opens a hosted checkout for the payment and answers its URL. */
  createCheckout(request: CheckoutRequest): Promise<{ checkoutUrl: string }>;
  /** Whether a posted result carries the gateway's signature (NFR-38). */
  verifySignature(result: SignedResult): boolean;
}

export interface Ports {
  payments: PaymentRepository;
  paymentGateway: PaymentGateway;
}

/** Bound by wire(); reading a port before that throws a clear error instead of an undefined access. */
export const ports: Ports = new Proxy({} as Ports, {
  get(target, key) {
    if (!(key in target)) throw new Error(`port ${String(key)} is not bound: call wire() of the infrastructure first`);
    return target[key as keyof Ports];
  },
});

export const bindPorts = (p: Partial<Ports>): void => { Object.assign(ports, p); };
