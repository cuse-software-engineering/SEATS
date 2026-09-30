// The API layer of the Payment Service: one function per method of payment.proto, from the request message to the
// response message (ADR-14). grpc.ts wraps it as the gRPC server; the monolith mode calls it in-process. The webhook of the (simulated) Payment Gateway reaches ReceivePaymentResult through the API Gateway.
import grpc from '@grpc/grpc-js';
import type { ApiOf } from '@seats/proto/api';
import type { PaymentHandlers } from '@seats/proto/gen/seats/payment/v1/Payment';
import * as domain from './domain.js';

const CODES: Record<number, grpc.status> = { 400: grpc.status.INVALID_ARGUMENT, 404: grpc.status.NOT_FOUND, 409: grpc.status.FAILED_PRECONDITION, 501: grpc.status.UNIMPLEMENTED };

/** A DomainError as the gRPC status the caller sees. */
export function toServiceError(e: unknown): grpc.ServiceError {
  if (e instanceof domain.DomainError) {
    const metadata = new grpc.Metadata();
    if (e.details !== undefined) metadata.set('error-details-bin', Buffer.from(JSON.stringify(e.details)));   // the gateway puts it in the JSON body
    return Object.assign(new Error(e.message), { code: CODES[e.status] ?? grpc.status.INTERNAL, details: e.message, metadata });
  }
  const message = e instanceof Error ? e.message : String(e);
  return Object.assign(new Error(message), { code: grpc.status.INTERNAL, details: message, metadata: new grpc.Metadata() });
}

export const api: ApiOf<PaymentHandlers> = {
  CreatePaymentRequest: (req) => domain.createPaymentRequest(req),
  ReceivePaymentResult: (req) => domain.receivePaymentResult(req),
  GetPaymentStatus: (req) => domain.getPaymentStatus(req),
};
