// The infrastructure of this service, composed: wire() binds the implementations to the domain's ports. server.ts, the
// monolith and the tests call it once; connectStore() first when the database may be MongoDB.
import { bindPorts } from '../domain/ports.js';
import { accounts, sessions } from './repositories.js';

export { connectStore, disconnectStore, resetStore, store } from './store.js';

/** Binds the repositories over the Staff Account DB to the domain's ports; the rules can be called after this. */
export function wire(): void { bindPorts({ accounts, sessions }); }
