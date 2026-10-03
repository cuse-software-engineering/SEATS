// Table Availability Service — the domain, the pure core: the model, the rules of the table map and the ports the
// infrastructure binds (wire()). No transport code and no store here.
export * from './table-status.js';
export type * from './model.js';
export { DomainError, InfrastructureError } from '@seats/errors/src/index.js';
