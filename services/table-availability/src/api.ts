// The API layer of the Table Availability Service: one function per method of table_availability.proto (ADR-14).
// grpc.ts wraps it as the gRPC server; the monolith mode calls it in-process.
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
  CreateRoundTableStatus: (req) => domain.createRoundTableStatus(req),
  GetRoundTableStatus: (req) => domain.getRoundTableStatus(req),
  CountAvailableTables: (req) => domain.countAvailableTables(req),
  HoldTable: (req) => domain.holdTable(req),
  ReleaseHold: (req) => domain.releaseHold(req),
  MarkTableBooked: (req) => domain.markTableBooked(req),
  MarkTableOccupied: (req) => domain.markTableOccupied(req),
  RemoveRoundTableStatus: (req) => domain.removeRoundTableStatus(req),
};
