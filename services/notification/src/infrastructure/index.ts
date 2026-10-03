// The infrastructure of this service, composed: wire() binds the implementations to the domain's ports. server.ts, the
// monolith and the tests call it once; connectStore() first when the database may be MongoDB.
import { bindPorts } from '../domain/ports.js';
import type { LineMessaging } from '../domain/ports.js';
import { messages } from './repositories.js';
import { adapters } from './adapters.js';
export { connectStore, disconnectStore, resetStore, store } from './store.js';
export { adapters } from './adapters.js';

export function wire(): void {
  // one delegate per method, so a test that sets failNext or swaps adapters.lineMessaging after wire() is followed
  const lineMessaging: LineMessaging = { push: (message) => adapters.lineMessaging.push(message) };
  bindPorts({ messages, lineMessaging });
}
