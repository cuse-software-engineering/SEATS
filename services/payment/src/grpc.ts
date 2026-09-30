// gRPC transport of the Payment Service, its only API (ADR-12): loads the contract and maps DomainError to gRPC status
// codes. The webhook of the (simulated) Payment Gateway reaches ReceivePaymentResult through the API Gateway.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import type { ProtoGrpcType } from '@seats/proto/gen/payment';
import type { ProtoGrpcType as HealthProto } from '@seats/proto/gen/health';
import type { HealthHandlers } from '@seats/proto/gen/grpc/health/v1/Health';
import type { PaymentHandlers } from '@seats/proto/gen/seats/payment/v1/Payment';
import * as domain from './domain.js';

const PROTO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../proto');
const OPTS = { keepCase: false, longs: Number, defaults: true };
const pkg = grpc.loadPackageDefinition(protoLoader.loadSync(path.join(PROTO_DIR, 'payment.proto'), OPTS)) as unknown as ProtoGrpcType;
const health = grpc.loadPackageDefinition(protoLoader.loadSync(path.join(PROTO_DIR, 'health.proto'), OPTS)) as unknown as HealthProto;

const CODES: Record<number, grpc.status> = { 400: grpc.status.INVALID_ARGUMENT, 404: grpc.status.NOT_FOUND, 409: grpc.status.FAILED_PRECONDITION, 501: grpc.status.UNIMPLEMENTED };

function toGrpcError(e: unknown): grpc.ServiceError {
  if (e instanceof domain.DomainError) {
    const metadata = new grpc.Metadata();
    if (e.details !== undefined) metadata.set('error-details-bin', Buffer.from(JSON.stringify(e.details)));   // the gateway puts it in the JSON body
    return Object.assign(new Error(e.message), { code: CODES[e.status] ?? grpc.status.INTERNAL, details: e.message, metadata });
  }
  const message = e instanceof Error ? e.message : String(e);
  return Object.assign(new Error(message), { code: grpc.status.INTERNAL, details: message, metadata: new grpc.Metadata() });
}

const unary = <Req, Res>(fn: (req: Req) => Res): grpc.handleUnaryCall<Req, Res> => (call, callback) => {
  try {
    callback(null, fn(call.request));
  } catch (e) {
    callback(toGrpcError(e));
  }
};

const handlers: PaymentHandlers = {
  CreatePaymentRequest: unary(domain.createPaymentRequest),
  ReceivePaymentResult: unary(domain.receivePaymentResult),
  GetPaymentStatus: unary(domain.getPaymentStatus),
};

const healthHandlers: HealthHandlers = { Check: (_call, callback) => callback(null, { status: 1 }) };   // SERVING

export function startGrpc(port: number): grpc.Server {
  const server = new grpc.Server();
  server.addService(pkg.seats.payment.v1.Payment.service, handlers);
  server.addService(health.grpc.health.v1.Health.service, healthHandlers);
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
    if (err) throw err;
    console.log(`[payment] gRPC on :${port}`);
  });
  return server;
}
