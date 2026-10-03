# Notification Service

The notices a customer receives on LINE: booking confirmation, hold expired, payment failed (Notification DB). Its only
API is gRPC :5005 (`proto/notification.proto`), one method per notice, called by the Booking Service and the Payment
Service (progress 2); no route of the gateway reaches it.

In progress 1 the LINE Messaging Adapter is a stub: each notice is recorded in the store and written to the log as
`[notification] LINE push to <customer_id>: <kind>`, and the result says delivered. The LINE Messaging API comes later.

- `src/domain/` — the pure core: `model.ts`, `repository.ts` (the `MessageRepository` interface), `ports.ts` (what the rules need from outside: `messages`, `lineMessaging`), `messages.ts` (`sendBookingConfirmation()`, `sendHoldExpiredNotice()`, `sendPaymentFailedNotice()`, `retryFailedMessages()`), behind the barrel `index.ts`.
- `src/infrastructure/` — the implementations of the ports: `store.ts` (the Notification DB: in memory, or MongoDB by configuration, ADR-06), `repositories.ts` (`messages` over the store), `adapters.ts` (the LINE Messaging fake), and `index.ts` whose `wire()` binds them to the domain's ports.
- `src/api/` — `handlers.ts` (one function per gRPC method, request message in, response message out) and `grpc.ts` (the gRPC server over it, plus the health check).
- `src/server.ts` — connects the store, calls `wire()`, starts gRPC and the retry job.
