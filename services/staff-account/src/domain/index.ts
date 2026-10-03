// Staff Account Service — the domain: the rules of accounts.ts, the model and the error kinds the rules refuse with.
// No transport code and no store here: the rules reach the database through the ports of ports.ts, which
// ../infrastructure/index.ts binds with wire().
export * from './accounts.js';
export type * from './model.js';
export { DomainError, InfrastructureError } from '@seats/errors/src/index.js';
