// The ports of the domain: what it needs from outside, as interfaces. infrastructure/index.ts binds the implementations
// (wire()); the rules call them through `ports` and never import the infrastructure.
import type { CreateRoundTableStatusRequest } from '@seats/proto/gen/seats/tableavailability/v1/CreateRoundTableStatusRequest';
import type { RoundTableStatus__Output } from '@seats/proto/gen/seats/tableavailability/v1/RoundTableStatus';
import type { CountAvailableTablesResponse__Output } from '@seats/proto/gen/seats/tableavailability/v1/CountAvailableTablesResponse';
import type { RemoveRoundTableStatusResponse__Output } from '@seats/proto/gen/seats/tableavailability/v1/RemoveRoundTableStatusResponse';
import type { BusinessParametersRepository, RoundRepository, TableTypeRepository, ZoneMapRepository } from './repository.js';

/** The Media Storage port (Table 5.2; FR-39): the object storage that keeps the image of the venue behind a zone map. */
export interface MediaStorage {
  /** Stores the image of a zone map and answers its URL; rejects when the object storage refuses it (UC-04 EF-3). */
  store(zoneMapId: string, fileName: string): Promise<{ url: string }>;
}

/** The Table Availability Service as the rules call it (ADR-12): the table status of a round is created when it is
 *  published or its table map changes, read for the booked tables, counted for the customer's list and removed before
 *  it is created again. A collaborator that does not answer surfaces as an InfrastructureError naming it. */
export interface TableAvailabilityClient {
  createRoundTableStatus(req: CreateRoundTableStatusRequest): Promise<RoundTableStatus__Output>;
  getRoundTableStatus(roundId: string): Promise<RoundTableStatus__Output>;
  countAvailableTables(roundIds: string[]): Promise<CountAvailableTablesResponse__Output>;
  removeRoundTableStatus(roundId: string): Promise<RemoveRoundTableStatusResponse__Output>;
}

export interface Ports {
  zoneMaps: ZoneMapRepository;
  tableTypes: TableTypeRepository;
  rounds: RoundRepository;
  businessParameters: BusinessParametersRepository;
  mediaStorage: MediaStorage;
  tableAvailability: TableAvailabilityClient;
}

/** Bound by wire(); reading a port before that throws a clear error instead of an undefined access. */
export const ports: Ports = new Proxy({} as Ports, {
  get(target, key) {
    if (!(key in target)) throw new Error(`port ${String(key)} is not bound: call wire() of the infrastructure first`);
    return target[key as keyof Ports];
  },
});
export const bindPorts = (p: Partial<Ports>): void => { Object.assign(ports, p); };
