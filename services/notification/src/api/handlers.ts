// The API layer of the Notification Service: one function per method of notification.proto, from the request message to the
// response message (ADR-14). grpc.ts wraps it as the gRPC server; the monolith mode calls it in-process. The LINE Messaging Adapter is a stub in progress 1.
import type { ApiOf } from '@seats/proto/api';
import type { NotificationHandlers } from '@seats/proto/gen/seats/notification/v1/Notification';
import * as domain from '../domain/index.js';
/** A failure as the gRPC status the caller sees (grpc.ts and the monolith take it from here). */
export { toServiceError } from '@seats/errors/src/index.js';

export const api: ApiOf<NotificationHandlers> = {
  SendBookingConfirmation: (req) => domain.sendBookingConfirmation(req),
  SendHoldExpiredNotice: (req) => domain.sendHoldExpiredNotice(req),
  SendPaymentFailedNotice: (req) => domain.sendPaymentFailedNotice(req),
};
