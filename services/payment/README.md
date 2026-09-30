# Payment Service

The payment context: one payment request per booking and the result the Payment Gateway reports for it (Payment DB).
Its only API is gRPC :5004 (`proto/payment.proto`): the Booking Service calls `CreatePaymentRequest` when the customer
pays (`startPayment()`, progress 2), the gateway's webhook route `POST /api/payments/webhook` delivers the result as
`ReceivePaymentResult`, and the customer's payment page polls `GET /api/payments/:id` (`GetPaymentStatus`).

In progress 1 the Payment Gateway is simulated (ADR-11): the checkout URL is `https://checkout.example/pay/<payment_id>`
and a result is accepted when its signature equals `sim-<payment_id>` and its amount matches the request. A result is
recorded once (Paid or Failed); a duplicate is acknowledged and ignored. Confirming the booking and the payment-failed
notice (gRPC to the Booking and Notification Services) come in progress 2.

- `src/domain.ts` — `createPaymentRequest()`, `receivePaymentResult()`, `getPaymentStatus()`.
- `src/store.ts` — in-memory store (swap for Mongoose, ADR-06).
- `src/model.ts`, `src/grpc.ts`, `src/server.ts` — transport only.
