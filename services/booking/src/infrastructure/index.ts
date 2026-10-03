// The infrastructure of this service, composed: wire() binds the implementations to the domain's ports. server.ts, the
// monolith and the tests call it once; connectStore() first when the database may be MongoDB.
import type { HoldTableRequest } from '@seats/proto/gen/seats/tableavailability/v1/HoldTableRequest';
import type { TableRef } from '@seats/proto/gen/seats/tableavailability/v1/TableRef';
import { bindPorts } from '../domain/ports.js';
import { bookings, profiles, tableLock } from './repositories.js';
import * as clients from './clients.js';

export { connectStore, disconnectStore, resetStore, store } from './store.js';
export * as clients from './clients.js';

/** Binds the repositories and the gRPC clients to the domain's ports. The client ports delegate call by call to the
 *  current method of the client objects, so the monolith's in-process patching and the tests' stubs on those objects
 *  are followed even when set after wire(). */
export function wire(): void {
  bindPorts({
    bookings,
    profiles,
    tableLock,
    concertRound: {
      getRound: (roundId: string) => clients.concertRound.getRound(roundId),
      getRoundPricing: (roundId: string) => clients.concertRound.getRoundPricing(roundId),
      getCheckInWindow: (roundId: string) => clients.concertRound.getCheckInWindow(roundId),
    },
    tableAvailability: {
      holdTable: (req: HoldTableRequest) => clients.tableAvailability.holdTable(req),
      releaseHold: (req: TableRef) => clients.tableAvailability.releaseHold(req),
      markTableBooked: (req: TableRef) => clients.tableAvailability.markTableBooked(req),
      markTableOccupied: (req: TableRef) => clients.tableAvailability.markTableOccupied(req),
    },
  });
}
