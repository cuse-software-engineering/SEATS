// The domain of the Payment Service: the rules (payments.ts), the types of its data model and the error kinds a caller
// tells apart. The API layer, the monolith and the tests import this barrel; the ports are bound by the infrastructure.
export * from './payments.js';
export type * from './model.js';
export { DomainError, InfrastructureError } from '@seats/errors/src/index.js';
