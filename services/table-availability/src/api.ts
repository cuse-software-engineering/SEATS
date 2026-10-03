// The API layer of the Table Availability Service: one function per method of table_availability.proto (ADR-14).
// grpc.ts wraps it as the gRPC server; the monolith mode calls it in-process. The domain is asynchronous (its store
// is), so every handler answers the domain's promise; both callers await it.
import grpc from '@grpc/grpc-js';
import type { ApiOf } from '@seats/proto/api';
import type { TableAvailabilityHandlers } from '@seats/proto/gen/seats/tableavailability/v1/TableAvailability';
import * as domain from './domain.js';

const CODES: Record<number, grpc.status> = { 400: grpc.status.INVALID_ARGUMENT, 404: grpc.status.NOT_FOUND, 409: grpc.status.FAILED_PRECONDITION };

/** A DomainError as the gRPC status the caller sees. */
export function toServiceError(e: unknown): grpc.ServiceError {
  const err = e instanceof domain.DomainError ? e : new Error(e instanceof Error ? e.message : String(e));
  return Object.assign(err, { code: CODES[(err as domain.DomainError).status] ?? grpc.status.INTERNAL, details: err.message, metadata: new grpc.Metadata() });
}

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
