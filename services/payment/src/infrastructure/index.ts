// The infrastructure of this service, composed: wire() binds the implementations to the domain's ports. server.ts, the
// monolith and the tests call it once; connectStore() first when the database may be MongoDB.
import { bindPorts } from '../domain/ports.js';
import { payments } from './repositories.js';
import { adapters } from './adapters.js';
export { connectStore, disconnectStore, resetStore, store } from './store.js';
export { adapters } from './adapters.js';

export function wire(): void {
  bindPorts({
    payments,
    // one delegate per method, read from the holder on every call, so a test that swaps adapters.paymentGateway is followed
    paymentGateway: {
      createCheckout: (request) => adapters.paymentGateway.createCheckout(request),
      verifySignature: (result) => adapters.paymentGateway.verifySignature(result),
    },
  });
}
