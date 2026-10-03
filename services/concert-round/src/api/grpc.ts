// gRPC transport of the Concert Round Service: the whole API (proto/concert_round.proto) served from the API layer of
// handlers.ts, plus the standard health check. No rules here.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import type { CallContext } from '@seats/proto/api';
import type { ProtoGrpcType } from '@seats/proto/gen/concert_round';
import type { ProtoGrpcType as HealthProto } from '@seats/proto/gen/health';
import type { ConcertRoundHandlers } from '@seats/proto/gen/seats/concertround/v1/ConcertRound';
import type { HealthHandlers } from '@seats/proto/gen/grpc/health/v1/Health';
import { api, toServiceError } from './handlers.js';

const PROTO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../proto');
const OPTS = { keepCase: false, longs: Number, defaults: true };
const pkg = grpc.loadPackageDefinition(protoLoader.loadSync(path.join(PROTO_DIR, 'concert_round.proto'), OPTS)) as unknown as ProtoGrpcType;
const health = grpc.loadPackageDefinition(protoLoader.loadSync(path.join(PROTO_DIR, 'health.proto'), OPTS)) as unknown as HealthProto;

const ctxOf = (md: grpc.Metadata): CallContext => ({ caller: md.get('x-user-id')[0]?.toString(), role: md.get('x-role')[0]?.toString() });
const unary = (fn: (request: any, ctx: CallContext) => unknown): grpc.handleUnaryCall<any, any> => (call, callback) => {
  Promise.resolve().then(() => fn(call.request, ctxOf(call.metadata))).then((res) => callback(null, res), (e: unknown) => callback(toServiceError(e)));
};
const handlers = Object.fromEntries(Object.entries(api).map(([name, fn]) => [name, unary(fn as (request: any, ctx: CallContext) => unknown)])) as unknown as ConcertRoundHandlers;
const healthHandlers: HealthHandlers = { Check: (_call, callback) => callback(null, { status: 1 }) };   // SERVING

export function startGrpc(port: number): grpc.Server {
  const server = new grpc.Server();
  server.addService(pkg.seats.concertround.v1.ConcertRound.service, handlers);
  server.addService(health.grpc.health.v1.Health.service, healthHandlers);
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
    if (err) throw err;
    console.log(`[concert-round] gRPC on :${port}`);
  });
  return server;
}
