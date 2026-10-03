# Payment Service

The payment context: one payment request per booking and the result the Payment Gateway reports for it (Payment DB).
Its only API is gRPC :5004 (`proto/payment.proto`): the Booking Service calls `CreatePaymentRequest` when the customer
pays (`startPayment()`, progress 2), the gateway's webhook route `POST /api/payments/webhook` delivers the result as
`ReceivePaymentResult`, and the customer's payment page polls `GET /api/payments/:id` (`GetPaymentStatus`).

In progress 1 the Payment Gateway is simulated (ADR-11): the checkout URL is `https://checkout.example/pay/<payment_id>`
and a result is accepted when its signature equals `sim-<payment_id>` and its amount matches the request. A result is
recorded once (Paid or Failed); a duplicate is acknowledged and ignored. Confirming the booking and the payment-failed
notice (gRPC to the Booking and Notification Services) come in progress 2.

- `src/domain/` — the pure core: `model.ts` (the Payment DB types), `repository.ts` (the `PaymentRepository` interface), `ports.ts` (the `PaymentGateway` port and the `ports` holder the rules call), `payments.ts` (`createPaymentRequest()`, `receivePaymentResult()`, `getPaymentStatus()`), `index.ts` (the barrel).
- `src/infrastructure/` — the implementations of the ports: `store.ts` (the Payment DB, `@seats/store`, memory or MongoDB per ADR-06), `repositories.ts` (the repository over it), `adapters.ts` (the simulated Payment Gateway, ADR-11), `index.ts` whose `wire()` binds them to the domain's ports.
- `src/api/` — `handlers.ts` (one function per method of `payment.proto`, the failures mapped by `toServiceError`) and `grpc.ts` (the gRPC server over the handlers plus the health check).
- `src/server.ts` — the composition root: `connectStore()`, `wire()`, `startGrpc()`.
