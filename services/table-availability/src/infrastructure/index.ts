// The infrastructure of this service, composed: wire() binds the implementations to the domain's ports. server.ts, the
// monolith and the tests call it once; connectStore() first when the database may be MongoDB.
import { bindPorts } from '../domain/ports.js';
import { roundTables } from './repositories.js';

export { connectStore, disconnectStore, resetStore, store } from './store.js';

/** Binds the repositories to the domain's ports; idempotent, so every caller may call it at start-up. */
export function wire(): void {
  bindPorts({ roundTables });
}
