// The API layer of the Payment Service: one function per method of payment.proto, from the request message to the
// response message (ADR-14). grpc.ts wraps it as the gRPC server; the monolith mode calls it in-process. The webhook of
// the (simulated) Payment Gateway reaches ReceivePaymentResult through the API Gateway.
import type { ApiOf } from '@seats/proto/api';
import type { PaymentHandlers } from '@seats/proto/gen/seats/payment/v1/Payment';
import * as domain from '../domain/index.js';

/** A failure as the gRPC status the caller sees: the one mapping of @seats/errors (a DomainError by its kind, an
 *  InfrastructureError as UNAVAILABLE, a defect as INTERNAL under a reference). grpc.ts and the monolith take it from here. */
export { toServiceError } from '@seats/errors/src/index.js';

export const api: ApiOf<PaymentHandlers> = {
  CreatePaymentRequest: (req) => domain.createPaymentRequest(req),
  ReceivePaymentResult: (req) => domain.receivePaymentResult(req),
  GetPaymentStatus: (req) => domain.getPaymentStatus(req),
};
