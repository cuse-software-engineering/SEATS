// gRPC transport of the Booking Service: the whole API (proto/booking.proto) served from the API layer of handlers.ts, the
// caller taken from the metadata x-user-id that the API Gateway sets, plus the standard health check. No rules here.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import type { CallContext } from '@seats/proto/api';
import type { ProtoGrpcType } from '@seats/proto/gen/booking';
import type { ProtoGrpcType as HealthProto } from '@seats/proto/gen/health';
import type { BookingsHandlers } from '@seats/proto/gen/seats/booking/v1/Bookings';
import type { HealthHandlers } from '@seats/proto/gen/grpc/health/v1/Health';
import { api, toServiceError } from './handlers.js';

const PROTO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../proto');
const OPTS = { keepCase: false, longs: Number, defaults: true };
const pkg = grpc.loadPackageDefinition(protoLoader.loadSync(path.join(PROTO_DIR, 'booking.proto'), OPTS)) as unknown as ProtoGrpcType;
const health = grpc.loadPackageDefinition(protoLoader.loadSync(path.join(PROTO_DIR, 'health.proto'), OPTS)) as unknown as HealthProto;

const ctxOf = (md: grpc.Metadata): CallContext => ({ caller: md.get('x-user-id')[0]?.toString(), role: md.get('x-role')[0]?.toString() });
/** One line per call, like the gateway's: who called which method and how it ended (the caller is the identity the
 *  gateway authenticated; a call from another service carries none). */
const log = (name: string, ctx: CallContext, started: number, outcome: string) =>
  console.log(`[booking] ${ctx.role ? `${ctx.role}:${ctx.caller ?? '-'} ` : ''}${name} -> ${outcome} (${Date.now() - started} ms)`);
const unary = (name: string, fn: (request: any, ctx: CallContext) => unknown): grpc.handleUnaryCall<any, any> => (call, callback) => {
  const ctx = ctxOf(call.metadata), started = Date.now();
  Promise.resolve().then(() => fn(call.request, ctx)).then(
    (res) => { log(name, ctx, started, 'OK'); callback(null, res); },
    (e: unknown) => { const err = toServiceError(e); log(name, ctx, started, `${grpc.status[err.code]} ${err.details}`); callback(err); },
  );
};
const handlers = Object.fromEntries(Object.entries(api).map(([name, fn]) => [name, unary(name, fn as (request: any, ctx: CallContext) => unknown)])) as unknown as BookingsHandlers;
const healthHandlers: HealthHandlers = { Check: (_call, callback) => callback(null, { status: 1 }) };   // SERVING

export function startGrpc(port: number): grpc.Server {
  const server = new grpc.Server();
  server.addService(pkg.seats.booking.v1.Bookings.service, handlers);
  server.addService(health.grpc.health.v1.Health.service, healthHandlers);
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
    if (err) throw err;
    console.log(`[booking] gRPC on :${port}`);
  });
  return server;
}
