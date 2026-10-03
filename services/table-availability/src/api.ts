// The API layer of the Table Availability Service: one function per method of table_availability.proto (ADR-14).
// grpc.ts wraps it as the gRPC server; the monolith mode calls it in-process. The domain is asynchronous (its store
// is), so every handler answers the domain's promise; both callers await it.
import type { ApiOf } from '@seats/proto/api';
import type { TableAvailabilityHandlers } from '@seats/proto/gen/seats/tableavailability/v1/TableAvailability';
import * as domain from './domain.js';

/** A failure as the gRPC status the caller sees (the shared mapping of @seats/errors); grpc.ts and the monolith use it. */
export { toServiceError } from '@seats/errors/src/index.js';

export const api: ApiOf<TableAvailabilityHandlers> = {
  CreateRoundTableStatus: async (req) => domain.createRoundTableStatus(req),
  GetRoundTableStatus: async (req) => domain.getRoundTableStatus(req),
  CountAvailableTables: async (req) => domain.countAvailableTables(req),
  HoldTable: async (req) => domain.holdTable(req),
  ReleaseHold: async (req) => domain.releaseHold(req),
  MarkTableBooked: async (req) => domain.markTableBooked(req),
  MarkTableOccupied: async (req) => domain.markTableOccupied(req),
  RemoveRoundTableStatus: async (req) => domain.removeRoundTableStatus(req),
};
