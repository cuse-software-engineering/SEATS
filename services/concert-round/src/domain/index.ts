// Concert Round Service — the operations of Table 5.3 (MVP), one function each, by use case; no transport code here.
// Every operation is asynchronous: the repositories answer promises, and a read answers a copy of the document, so an
// operation that changes what it read save()s it back. shared.ts is internal to the folder and is not re-exported.
export * from './business-parameters.js';
export * from './table-types.js';
export * from './zone-maps.js';
export * from './rounds.js';
export { DomainError, InfrastructureError } from '@seats/errors/src/index.js';
