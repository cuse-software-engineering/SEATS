// gRPC transport of the Notification Service, its only API (ADR-12): the API layer of handlers.ts served over gRPC plus the
// standard health check. No rules here.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import type { CallContext } from '@seats/proto/api';
import type { ProtoGrpcType } from '@seats/proto/gen/notification';
import type { ProtoGrpcType as HealthProto } from '@seats/proto/gen/health';
import type { NotificationHandlers } from '@seats/proto/gen/seats/notification/v1/Notification';
import type { HealthHandlers } from '@seats/proto/gen/grpc/health/v1/Health';
import { api, toServiceError } from './handlers.js';

const PROTO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../proto');
const OPTS = { keepCase: false, longs: Number, defaults: true };
const pkg = grpc.loadPackageDefinition(protoLoader.loadSync(path.join(PROTO_DIR, 'notification.proto'), OPTS)) as unknown as ProtoGrpcType;
const health = grpc.loadPackageDefinition(protoLoader.loadSync(path.join(PROTO_DIR, 'health.proto'), OPTS)) as unknown as HealthProto;

const ctxOf = (md: grpc.Metadata): CallContext => ({ caller: md.get('x-user-id')[0]?.toString(), role: md.get('x-role')[0]?.toString() });
const unary = (fn: (request: any, ctx: CallContext) => unknown): grpc.handleUnaryCall<any, any> => (call, callback) => {
  Promise.resolve().then(() => fn(call.request, ctxOf(call.metadata))).then((res) => callback(null, res), (e: unknown) => callback(toServiceError(e)));
};
const handlers = Object.fromEntries(Object.entries(api).map(([name, fn]) => [name, unary(fn as (request: any, ctx: CallContext) => unknown)])) as unknown as NotificationHandlers;
const healthHandlers: HealthHandlers = { Check: (_call, callback) => callback(null, { status: 1 }) };   // SERVING

export function startGrpc(port: number): grpc.Server {
  const server = new grpc.Server();
  server.addService(pkg.seats.notification.v1.Notification.service, handlers);
  server.addService(health.grpc.health.v1.Health.service, healthHandlers);
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
    if (err) throw err;
    console.log(`[notification] gRPC on :${port}`);
  });
  return server;
}
