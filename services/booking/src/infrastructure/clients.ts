// gRPC clients of the Concert Round Service and the Table Availability Service (ADR-12). Every call carries a deadline.
// A collaborator that does not answer (down, slow, broken) is an InfrastructureError naming it; its own refusals
// (NOT_FOUND, FAILED_PRECONDITION) pass through as gRPC errors for the domain to translate with refusalOf() of
// @seats/errors. index.ts binds these objects to the domain's ports through delegates, so the monolith's in-process
// patching and the tests' stubs on the objects themselves are followed.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { fromCollaborator } from '@seats/errors/src/index.js';
import type { ProtoGrpcType as ConcertRoundProto } from '@seats/proto/gen/concert_round';
import type { ProtoGrpcType as TableAvailabilityProto } from '@seats/proto/gen/table_availability';
import type { Round__Output } from '@seats/proto/gen/seats/concertround/v1/Round';
import type { RoundPricing__Output } from '@seats/proto/gen/seats/concertround/v1/RoundPricing';
import type { CheckInWindow__Output } from '@seats/proto/gen/seats/concertround/v1/CheckInWindow';
import type { TableRef } from '@seats/proto/gen/seats/tableavailability/v1/TableRef';
import type { HoldTableRequest } from '@seats/proto/gen/seats/tableavailability/v1/HoldTableRequest';
import type { TableStatus__Output } from '@seats/proto/gen/seats/tableavailability/v1/TableStatus';

const here = path.dirname(fileURLToPath(import.meta.url));
const load = (file: string) => grpc.loadPackageDefinition(protoLoader.loadSync(path.resolve(here, '../../../../proto', file), { keepCase: false, longs: Number, defaults: true }));
const roundPkg = load('concert_round.proto') as unknown as ConcertRoundProto;
const tablePkg = load('table_availability.proto') as unknown as TableAvailabilityProto;
const roundClient = new roundPkg.seats.concertround.v1.ConcertRound(process.env.CONCERT_ROUND_GRPC ?? 'localhost:5001', grpc.credentials.createInsecure());
const tableClient = new tablePkg.seats.tableavailability.v1.TableAvailability(process.env.TABLE_AVAILABILITY_GRPC ?? 'localhost:5003', grpc.credentials.createInsecure());
const ROUND_SERVICE = 'the Concert Round Service', TABLE_SERVICE = 'the Table Availability Service';

const DEADLINE_MS = 2000;
const opts = (): grpc.CallOptions => ({ deadline: Date.now() + DEADLINE_MS });
const promisify = <Res>(system: string, run: (cb: grpc.requestCallback<Res>) => void) =>
  new Promise<Res>((resolve, reject) => run((err, res) => (err ? reject(fromCollaborator(system, err)) : resolve(res as Res))));

export const concertRound = {
  getRound: (roundId: string) => promisify<Round__Output>(ROUND_SERVICE, (cb) => roundClient.getRound({ roundId }, opts(), cb)),
  getRoundPricing: (roundId: string) => promisify<RoundPricing__Output>(ROUND_SERVICE, (cb) => roundClient.getRoundPricing({ roundId }, opts(), cb)),
  getCheckInWindow: (roundId: string) => promisify<CheckInWindow__Output>(ROUND_SERVICE, (cb) => roundClient.getCheckInWindow({ roundId }, opts(), cb)),
};

export const tableAvailability = {
  holdTable: (req: HoldTableRequest) => promisify<TableStatus__Output>(TABLE_SERVICE, (cb) => tableClient.holdTable(req, opts(), cb)),
  releaseHold: (req: TableRef) => promisify<TableStatus__Output>(TABLE_SERVICE, (cb) => tableClient.releaseHold(req, opts(), cb)),
  markTableBooked: (req: TableRef) => promisify<TableStatus__Output>(TABLE_SERVICE, (cb) => tableClient.markTableBooked(req, opts(), cb)),
  markTableOccupied: (req: TableRef) => promisify<TableStatus__Output>(TABLE_SERVICE, (cb) => tableClient.markTableOccupied(req, opts(), cb)),
};

/** A collaborator's refusal with this status; the unit tests build fake gRPC errors with it. The domain reads a
 *  refusal with refusalOf() of @seats/errors and never sees a gRPC status. */
export const isGrpcError = (e: unknown, code: grpc.status): boolean => typeof e === 'object' && e !== null && (e as grpc.ServiceError).code === code;
export const GRPC_STATUS = grpc.status;
