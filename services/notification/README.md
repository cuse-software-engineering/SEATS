# Notification Service

The notices a customer receives on LINE: booking confirmation, hold expired, payment failed (Notification DB). Its gRPC
API :5005 (`proto/notification.proto`), one method per notice, is called by the Payment Service (progress 2); no route
of the gateway reaches it. The Booking Service's hold-expired notice instead arrives as an event on the message broker
(`booking.hold-expired`), consumed in `src/api/consumer.ts` and turned into the same `sendHoldExpiredNotice()` the gRPC
method would call, without the Booking Service waiting on the outcome.

In progress 1 the LINE Messaging Adapter is a stub: each notice is recorded in the store and written to the log as
`[notification] LINE push to <customer_id>: <kind>`, and the result says delivered. The LINE Messaging API comes later.

- `src/domain/` — the pure core: `model.ts`, `repository.ts` (the `MessageRepository` interface), `ports.ts` (what the rules need from outside: `messages`, `lineMessaging`), `messages.ts` (`sendBookingConfirmation()`, `sendHoldExpiredNotice()`, `sendPaymentFailedNotice()`, `retryFailedMessages()`), behind the barrel `index.ts`.
- `src/infrastructure/` — the implementations of the ports: `store.ts` (the Notification DB: in memory, or MongoDB by configuration, ADR-06), `repositories.ts` (`messages` over the store), `adapters.ts` (the LINE Messaging fake), `broker.ts` (the message broker, in process or RabbitMQ, `@seats/messaging`), and `index.ts` whose `wire()` binds the first three to the domain's ports.
- `src/api/` — `handlers.ts` (one function per gRPC method, request message in, response message out) and `grpc.ts` (the gRPC server over it, plus the health check); `consumer.ts` is the broker's side, `startConsumers()` registering the hold-expiry handler.
- `src/server.ts` — connects the store and the broker, calls `wire()`, registers the consumer, starts gRPC and the retry job.
