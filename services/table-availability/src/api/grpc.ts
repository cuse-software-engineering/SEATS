// gRPC transport of the Table Availability Service, its only API (ADR-12): the API layer of handlers.ts served over gRPC
// plus the standard health check. The polled read of the web apps (ADR-09) is GetRoundTableStatus, served by the
// API Gateway with an ETag. No rules here.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import type { CallContext } from '@seats/proto/api';
import type { ProtoGrpcType } from '@seats/proto/gen/table_availability';
import type { ProtoGrpcType as HealthProto } from '@seats/proto/gen/health';
import type { TableAvailabilityHandlers } from '@seats/proto/gen/seats/tableavailability/v1/TableAvailability';
import type { HealthHandlers } from '@seats/proto/gen/grpc/health/v1/Health';
import { api, toServiceError } from './handlers.js';

const PROTO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../proto');
const OPTS = { keepCase: false, longs: Number, defaults: true };
const pkg = grpc.loadPackageDefinition(protoLoader.loadSync(path.join(PROTO_DIR, 'table_availability.proto'), OPTS)) as unknown as ProtoGrpcType;
const health = grpc.loadPackageDefinition(protoLoader.loadSync(path.join(PROTO_DIR, 'health.proto'), OPTS)) as unknown as HealthProto;

const ctxOf = (md: grpc.Metadata): CallContext => ({ caller: md.get('x-user-id')[0]?.toString(), role: md.get('x-role')[0]?.toString() });
/** Two log lines per call, like the gateway's: `req` when it arrives (its number, the caller the gateway authenticated,
 *  none for a call from another service or from grpcurl, the method) and `res` when it ends (OK, or the gRPC status and
 *  the message, and the time taken). The number counts the calls of this process since it started. */
let seq = 0;
const clock = () => { const d = new Date(); return `${d.toTimeString().slice(0, 8)}.${String(d.getMilliseconds()).padStart(3, '0')}`; };
const line = (n: number, what: string) => console.log(`[table-availability] #${n} ${clock()} ${what}`);
const unary = (name: string, fn: (request: any, ctx: CallContext) => unknown): grpc.handleUnaryCall<any, any> => (call, callback) => {
  const ctx = ctxOf(call.metadata), started = Date.now(), n = ++seq;
  line(n, `req ${ctx.role ? `${ctx.role}:${ctx.caller ?? '-'} ` : ''}${name}`);
  Promise.resolve().then(() => fn(call.request, ctx)).then(
    (res) => { line(n, `res ${name} OK (${Date.now() - started} ms)`); callback(null, res); },
    (e: unknown) => { const err = toServiceError(e); line(n, `res ${name} ${grpc.status[err.code]} ${err.details} (${Date.now() - started} ms)`); callback(err); },
  );
};
const handlers = Object.fromEntries(Object.entries(api).map(([name, fn]) => [name, unary(name, fn as (request: any, ctx: CallContext) => unknown)])) as unknown as TableAvailabilityHandlers;
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
