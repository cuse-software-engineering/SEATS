// The domain of the Booking Service: the operations of Table 5.3 (MVP), one file per use case, the model, the failures
// they throw. No transport, no database, no gRPC here: the rules reach the outside only through the ports (ports.ts),
// which infrastructure/index.ts binds with wire(). api/handlers.ts, server.ts, the tests and the monolith import this.
export * from './booking.js';
export * from './expiry.js';
export * from './profile.js';
export * from './progress2.js';
export type * from './model.js';
export { DomainError, InfrastructureError } from '@seats/errors/src/index.js';
