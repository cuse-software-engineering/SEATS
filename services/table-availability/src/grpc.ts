// gRPC transport of the Table Availability Service: loads the contract and maps DomainError to gRPC status codes.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import type { ProtoGrpcType } from '@seats/proto/gen/table_availability';
import type { TableAvailabilityHandlers } from '@seats/proto/gen/seats/tableavailability/v1/TableAvailability';
import * as domain from './domain.js';

const PROTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../proto/table_availability.proto');
const pkg = grpc.loadPackageDefinition(protoLoader.loadSync(PROTO, { keepCase: false, longs: Number, defaults: true })) as unknown as ProtoGrpcType;

const CODES: Record<number, grpc.status> = { 400: grpc.status.INVALID_ARGUMENT, 404: grpc.status.NOT_FOUND, 409: grpc.status.FAILED_PRECONDITION };

const unary = <Req, Res>(fn: (req: Req) => Res): grpc.handleUnaryCall<Req, Res> => (call, callback) => {
  try {
    callback(null, fn(call.request));
  } catch (e) {
    const err = e instanceof domain.DomainError ? e : new Error(String(e));
    callback(Object.assign(err, { code: CODES[(err as domain.DomainError).status] ?? grpc.status.INTERNAL }));
  }
};

const handlers: TableAvailabilityHandlers = {
  InitializeRoundTableStatus: unary(domain.initializeRoundTableStatus),
  GetRoundTableStatus: unary(domain.getRoundTableStatus),
  CountAvailableTables: unary(domain.countAvailableTables),
  HoldTable: unary(domain.holdTable),
  ReleaseHold: unary(domain.releaseHold),
  MarkTableBooked: unary(domain.markTableBooked),
  MarkTableOccupied: unary(domain.markTableOccupied),
  RemoveRoundTableStatus: unary(domain.removeRoundTableStatus),
};

export function startGrpc(port: number): grpc.Server {
  const server = new grpc.Server();
  server.addService(pkg.seats.tableavailability.v1.TableAvailability.service, handlers);
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
    if (err) throw err;
    console.log(`[table-availability] gRPC on :${port}`);
  });
  return server;
}
