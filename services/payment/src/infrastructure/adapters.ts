// The adapters of the Payment Service: the Payment Gateway behind the domain's port (domain/ports.ts) and its fake
// (Table 5.2: an adapter is a module of the service that uses it; ADR-11: the gateway is simulated in the MVP so that
// the real one can replace it). The fake is the default; PAYMENT_GATEWAY selects another implementation when one exists.
import type { CheckoutRequest, PaymentGateway, SignedResult } from '../domain/ports.js';
export type { CheckoutRequest, PaymentGateway, SignedResult } from '../domain/ports.js';

/** The simulated Payment Gateway (ADR-11): a fake checkout URL and the signature `sim-<payment id>`. Records every checkout. */
export class SimulatedPaymentGateway implements PaymentGateway {
  readonly checkouts: CheckoutRequest[] = [];
  async createCheckout(request: CheckoutRequest): Promise<{ checkoutUrl: string }> {
    this.checkouts.push(request);
    return { checkoutUrl: `https://checkout.example/pay/${request.paymentId}` };
  }
  verifySignature(result: SignedResult): boolean {
    return result.signature === `sim-${result.paymentId}`;
  }
  /** The result the simulated gateway posts to the webhook for a checkout. */
  signedResult(paymentId: string, status: 'Paid' | 'Failed', amount: number): SignedResult {
    return { paymentId, status, amount, signature: `sim-${paymentId}` };
  }
}

export function paymentGatewayFromEnv(): PaymentGateway {
  const kind = process.env.PAYMENT_GATEWAY ?? 'simulated';
  if (kind === 'simulated') return new SimulatedPaymentGateway();
  throw new Error(`PAYMENT_GATEWAY=${kind}: only "simulated" is built; the adapter of the real gateway comes with the merchant account`);
}

/** The adapter in use; tests replace it. wire() binds delegates that read this holder on every call, so a swap is followed. */
export const adapters = { paymentGateway: paymentGatewayFromEnv() };
