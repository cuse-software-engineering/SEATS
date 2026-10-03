# Notification Service

The notices a customer receives on LINE: booking confirmation, hold expired, payment failed (Notification DB). Its only
API is gRPC :5005 (`proto/notification.proto`), one method per notice, called by the Booking Service and the Payment
Service (progress 2); no route of the gateway reaches it.

In progress 1 the LINE Messaging Adapter is a stub: each notice is recorded in the store and written to the log as
`[notification] LINE push to <customer_id>: <kind>`, and the result says delivered. The LINE Messaging API comes later.

- `src/domain.ts` — `sendBookingConfirmation()`, `sendHoldExpiredNotice()`, `sendPaymentFailedNotice()`, `retryFailedMessages()`.
- `src/repository.ts` — `MessageRepository`, the domain's view of the Notification DB (`messages`).
- `src/store.ts` — the Notification DB: in memory, or MongoDB by configuration (ADR-06).
- `src/model.ts`, `src/grpc.ts`, `src/server.ts` — transport only.
