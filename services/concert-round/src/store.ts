// The Round DB of this service (ADR-06: one database per service). repository.ts talks to Collection<T> of @seats/store
// on the domain's behalf; the implementation is chosen when the service starts: CONCERT_ROUND_MONGO_URL, or MONGO_URL
// with the database seats_concert_round, selects MongoDB through Mongoose; otherwise the database is in memory
// (development, the tests, the free-plan demo deployment).
import { serviceStore } from '@seats/store/src/index.js';
export type { Collection } from '@seats/store/src/index.js';
export { DuplicateKeyError } from '@seats/store/src/index.js';

export const store = serviceStore('concert-round');
/** A collection handle of this service's database; repository.ts takes its handles at module load, nobody else. */
export const collection = store.collection;
/** Chooses the implementation from the configuration; server.ts and the monolith call it before serving. */
export const connectStore = store.connect;
/** Empties every collection; the tests call it before each case. */
export const resetStore = store.reset;
/** Closes the database connection and goes back to memory. */
export const disconnectStore = store.close;
