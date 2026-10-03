// The domain of the Booking Service: the operations of Table 5.3 (MVP), one file per use case, and the failures they
// throw. No transport code here. domain.ts at the old path re-exports this folder for api.ts, server.ts, the tests and
// the monolith.
export * from './booking.js';
export * from './expiry.js';
export * from './profile.js';
export * from './progress2.js';
export { DomainError, InfrastructureError } from '@seats/errors/src/index.js';
