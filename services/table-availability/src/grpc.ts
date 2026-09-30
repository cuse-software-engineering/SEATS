// gRPC transport of the Table Availability Service, its only API (ADR-12): loads the contract and maps DomainError to
// gRPC status codes. The polled read of the web apps (ADR-09) is GetRoundTableStatus, served by the API Gateway with an ETag.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import type { ProtoGrpcType } from '@seats/proto/gen/table_availability';
import type { ProtoGrpcType as HealthProto } from '@seats/proto/gen/health';
import type { HealthHandlers } from '@seats/proto/gen/grpc/health/v1/Health';
import type { TableAvailabilityHandlers } from '@seats/proto/gen/seats/tableavailability/v1/TableAvailability';
import * as domain from './domain.js';

const PROTO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../proto');
const OPTS = { keepCase: false, longs: Number, defaults: true };
const pkg = grpc.loadPackageDefinition(protoLoader.loadSync(path.join(PROTO_DIR, 'table_availability.proto'), OPTS)) as unknown as ProtoGrpcType;
const health = grpc.loadPackageDefinition(protoLoader.loadSync(path.join(PROTO_DIR, 'health.proto'), OPTS)) as unknown as HealthProto;

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
  CreateRoundTableStatus: unary(domain.createRoundTableStatus),
  GetRoundTableStatus: unary(domain.getRoundTableStatus),
  CountAvailableTables: unary(domain.countAvailableTables),
  HoldTable: unary(domain.holdTable),
  ReleaseHold: unary(domain.releaseHold),
  MarkTableBooked: unary(domain.markTableBooked),
  MarkTableOccupied: unary(domain.markTableOccupied),
  RemoveRoundTableStatus: unary(domain.removeRoundTableStatus),
};

const healthHandlers: HealthHandlers = { Check: (_call, callback) => callback(null, { status: 1 }) };   // SERVING

export function startGrpc(port: number): grpc.Server {
  const server = new grpc.Server();
  server.addService(pkg.seats.tableavailability.v1.TableAvailability.service, handlers);
  server.addService(health.grpc.health.v1.Health.service, healthHandlers);
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
    if (err) throw err;
    console.log(`[table-availability] gRPC on :${port}`);
  });
  return server;
}
