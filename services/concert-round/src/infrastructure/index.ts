// The infrastructure of this service, composed: wire() binds the implementations to the domain's ports. server.ts, the
// monolith and the tests call it once; connectStore() first when the database may be MongoDB.
import { bindPorts, type MediaStorage, type TableAvailabilityClient } from '../domain/ports.js';
import { businessParameters, rounds, tableTypes, zoneMaps } from './repositories.js';
import { adapters } from './adapters.js';
import * as clients from './clients.js';
export { connectStore, disconnectStore, resetStore, store } from './store.js';
export { adapters } from './adapters.js';
export * as clients from './clients.js';

// Delegates rather than the objects themselves, so that every call reads the object in use at that moment: a test that
// swaps adapters.mediaStorage or sets its failNext, and the monolith that patches clients.tableAvailability for
// in-process calls, are followed without rebinding.
const mediaStorage: MediaStorage = {
  store: (zoneMapId, fileName) => adapters.mediaStorage.store(zoneMapId, fileName),
};
const tableAvailability: TableAvailabilityClient = {
  createRoundTableStatus: (req) => clients.tableAvailability.createRoundTableStatus(req),
  getRoundTableStatus: (roundId) => clients.tableAvailability.getRoundTableStatus(roundId),
  countAvailableTables: (roundIds) => clients.tableAvailability.countAvailableTables(roundIds),
  removeRoundTableStatus: (roundId) => clients.tableAvailability.removeRoundTableStatus(roundId),
};

/** Binds the repositories, the Media Storage Adapter and the Table Availability client to the domain's ports. */
export function wire(): void {
  bindPorts({ zoneMaps, tableTypes, rounds, businessParameters, mediaStorage, tableAvailability });
}
