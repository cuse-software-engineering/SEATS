// The ports of the domain: what it needs from outside, as interfaces. infrastructure/index.ts binds the implementations
// (wire()); the rules call them through `ports` and never import the infrastructure.
import type { Round__Output } from '@seats/proto/gen/seats/concertround/v1/Round';
import type { RoundPricing__Output } from '@seats/proto/gen/seats/concertround/v1/RoundPricing';
import type { CheckInWindow__Output } from '@seats/proto/gen/seats/concertround/v1/CheckInWindow';
import type { TableRef } from '@seats/proto/gen/seats/tableavailability/v1/TableRef';
import type { HoldTableRequest } from '@seats/proto/gen/seats/tableavailability/v1/HoldTableRequest';
import type { TableStatus__Output } from '@seats/proto/gen/seats/tableavailability/v1/TableStatus';
import type { BookingRepository, CustomerProfileRepository, TableLock } from './repository.js';

/** The Concert Round Service as the domain uses it (the shape of `concertRound` in infrastructure/clients.ts). */
export interface ConcertRoundClient {
  getRound(roundId: string): Promise<Round__Output>;
  getRoundPricing(roundId: string): Promise<RoundPricing__Output>;
  getCheckInWindow(roundId: string): Promise<CheckInWindow__Output>;
}

/** The Table Availability Service, the read model that follows every hold and release (ADR-13). */
export interface TableAvailabilityClient {
  holdTable(req: HoldTableRequest): Promise<TableStatus__Output>;
  releaseHold(req: TableRef): Promise<TableStatus__Output>;
  markTableBooked(req: TableRef): Promise<TableStatus__Output>;
  markTableOccupied(req: TableRef): Promise<TableStatus__Output>;
}

/** The event a hold's expiry publishes (UC-01 EF-1, ADR-08); infrastructure/broker.ts carries it on the message
 *  broker to the Notification Service. The job does not wait on it: a failure to publish is a warning, not a reason
 *  to leave the booking Held. */
export interface HoldExpiredEvent {
  bookingId: string;
  customerId: string;
  roundId: string;
  roundName: string;
  tableNumber: number;
}

export interface BookingEvents {
  holdExpired(event: HoldExpiredEvent): Promise<void>;
}

export interface Ports {
  bookings: BookingRepository;
  profiles: CustomerProfileRepository;
  tableLock: TableLock;
  concertRound: ConcertRoundClient;
  tableAvailability: TableAvailabilityClient;
  events: BookingEvents;
}

/** Bound by wire(); reading a port before that throws a clear error instead of an undefined access. */
export const ports: Ports = new Proxy({} as Ports, {
  get(target, key) {
    if (!(key in target)) throw new Error(`port ${String(key)} is not bound: call wire() of the infrastructure first`);
    return target[key as keyof Ports];
  },
});

export const bindPorts = (p: Partial<Ports>): void => { Object.assign(ports, p); };
