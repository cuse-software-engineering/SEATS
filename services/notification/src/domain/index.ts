// The domain of the Notification Service: the rules of messages.ts, the model and the failures they throw. No transport
// code, no database: the infrastructure binds the ports (infrastructure/index.ts, wire()). api/handlers.ts, server.ts,
// the tests and the monolith import this barrel.
export * from './messages.js';
export type * from './model.js';
export type { LineMessage, LineMessaging, Ports } from './ports.js';
export type { MessageRepository } from './repository.js';
export { DomainError, InfrastructureError } from '@seats/errors/src/index.js';
