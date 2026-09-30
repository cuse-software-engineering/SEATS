# Contracts

Agreed before code (tasks.txt, section 2). Operation names are those of Table 5.3 of the project document. Every
service has exactly one API, gRPC, described by its `.proto` file in `proto/`; the messages are the types of the
owning service's `src/model.ts`, derived from the data model in [data-model.md](data-model.md). The API Gateway is
the only REST API of the system (ADR-12): each route below is one gRPC call on the owning service. The path
parameters, the query and the JSON body become the request message, the response message is the JSON answer, and
the caller's identity travels as the gRPC metadata `x-user-id` and `x-role` (fake auth in progress 1). A service
never speaks REST, and a service never calls another service through the gateway.

## API Gateway (REST :4000)

| Route | gRPC method | Roles |
|---|---|---|
| `PUT /api/table-types/:id`, `GET /api/table-types` | ConcertRound/DefineTableType, ListTableTypes | write: manager; read: manager, owner |
| `GET`, `PUT /api/business-parameters` | ConcertRound/GetBusinessParameters, UpdateBusinessParameters | read: manager, owner; write: manager |
| `POST`, `GET /api/zone-maps`; `GET`, `PUT`, `DELETE /api/zone-maps/:id`; `POST /api/zone-maps/:id/{image,validate,activate}` | ConcertRound/CreateZoneMap, ListZoneMaps, GetZoneMap, UpdateZoneMap, DiscardDraftZoneMap, UploadZoneMapImage, ValidateZoneMap, ActivateZoneMap | write: manager; read: manager, owner |
| `POST /api/rounds`; `PUT`, `DELETE /api/rounds/:id`; `POST /api/rounds/:id/{validate,publish}` | ConcertRound/CreateRound, UpdateRound, DiscardDraftRound, ValidateRound, PublishRound | manager |
| `GET /api/rounds`, `GET /api/rounds/:id`, `GET /api/rounds/:id/tables` | ConcertRound/GetUpcomingRounds, GetRound, GetRoundTables | everyone |
| `GET /api/rounds/:id/table-status` | TableAvailability/GetRoundTableStatus | everyone; `If-None-Match: <version>` answers 304 |
| `POST /api/bookings`; `GET /api/bookings/:id`; `PUT /api/bookings/:id/party-size`; `GET /api/bookings/:id/terms`; `POST /api/bookings/:id/{terms-acceptance,payment,cancel}`; `GET /api/bookings/:id/e-ticket` | Bookings/CreateHeldBooking, GetBooking, SetPartySize, GetBookingTerms, AcceptBookingTerms, StartPayment, CancelBooking, GetETicket | customer |
| `GET`, `POST`, `PUT /api/customers/me`; `GET /api/customers/me/bookings` | Bookings/GetCustomerProfile, CreateCustomerProfile, UpdateCustomerProfile, GetCustomerBookings | customer |
| `POST /api/check-ins/verify`, `POST /api/check-ins` | Bookings/VerifyBookingReference, CheckInBooking | front_staff, manager |
| `GET /api/rounds/:id/bookings` | Bookings/GetRoundBookings | manager, owner |
| `POST /api/payments/webhook` | Payment/ReceivePaymentResult | none: the Payment Gateway's callback, checked by its signature (ADR-11) |
| `GET /api/payments/:id` | Payment/GetPaymentStatus | customer |
| `POST /api/sessions`; `DELETE /api/sessions/current` | StaffAccounts/SignIn, SignOut | sign-in: none; sign-out: manager, front_staff, owner (the token of `Authorization: Bearer <token>`, else `x-user-id`) |
| `POST`, `GET /api/staff-accounts`; `PUT`, `DELETE /api/staff-accounts/:id` | StaffAccounts/CreateStaffAccount, ListStaffAccounts, UpdateStaffAccount, DisableStaffAccount | write: manager; read: manager, owner |

A list message (`TableTypeList`, `ZoneMapList`, `UpcomingRoundList`, `RoundTableList`, `BookingList`, `StaffAccountList`)
is unwrapped to a JSON array. A route with the role `none` needs no `x-user-id` / `x-role` headers and skips the role
check. `GET /health` calls `grpc.health.v1.Health/Check` on every service. The gateway holds no business
logic: `gateway/src/routes.ts` is the whole mapping, and a route's request builder is type-checked against the
generated request message.

| gRPC status of the service | HTTP status |
|---|---|
| `INVALID_ARGUMENT` | 400 `{error, details?}` |
| `UNAUTHENTICATED` (a refused sign-in) | 401 |
| `PERMISSION_DENIED` (and a role refused by the gateway itself) | 403 |
| `NOT_FOUND` | 404 |
| `FAILED_PRECONDITION`, `ALREADY_EXISTS`, `ABORTED` (a rule refuses the change, e.g. the table was just taken) | 409 `{error, details?}` |
| `UNIMPLEMENTED` (progress 2) | 501 |
| `UNAVAILABLE` (the service is down or a collaborator of it failed), `DEADLINE_EXCEEDED` | 502, 504 |

`details` is the service's error detail (the problems of a validation, the booked tables of a refused map change),
carried in the trailing metadata `error-details-bin`.

## Concert Round Service (gRPC :5001, `proto/concert_round.proto`)

The "REST service with CRUD" of Deliverable 3 is the gateway's REST API over this service.

| Operation (Table 5.3) | gRPC method | Route | Notes |
|---|---|---|---|
| createZoneMap() | CreateZoneMap `{name?}` | `POST /zone-maps` | new Draft map (C) |
| listZoneMaps() | ListZoneMaps `{status?}` | `GET /zone-maps?status=Active` | summaries (R) |
| getZoneMap() | GetZoneMap `{zone_map_id}` | `GET /zone-maps/:id` | with tables and capacity per zone (R) |
| updateZoneMap() | UpdateZoneMap `{zone_map_id, name?, zones?, tables?}` | `PUT /zone-maps/:id` | a field left out is unchanged; Active: AF-1 rules (U) |
| uploadZoneMapImage() | UploadZoneMapImage `{zone_map_id, file_name}` | `POST /zone-maps/:id/image` | Media Storage Adapter stub returns the URL |
| validateZoneMap() | ValidateZoneMap | `POST /zone-maps/:id/validate` | UC-04 S-1; `{valid, problems}` |
| activateZoneMap() | ActivateZoneMap | `POST /zone-maps/:id/activate` | validates first; idempotent |
| discardDraftZoneMap() | DiscardDraftZoneMap | `DELETE /zone-maps/:id` | Draft only (D) |
| defineTableType() | DefineTableType `{id, name, capacity, package_content}` | `PUT /table-types/:id` | venue table types |
| listTableTypes() | ListTableTypes | `GET /table-types` | |
| getBusinessParameters() | GetBusinessParameters | `GET /business-parameters` | |
| updateBusinessParameters() | UpdateBusinessParameters (every field optional) | `PUT /business-parameters` | hold period, check-in window, grace period, extra-person fee |
| createRound() | CreateRound `{name?}` | `POST /rounds` | new Draft round (C) |
| getUpcomingRounds() | GetUpcomingRounds | `GET /rounds` | not yet open / open / sold out (gRPC CountAvailableTables) (R) |
| getRound() | GetRound `{round_id}` | `GET /rounds/:id` | the round with its tables and the hold period in force; also the Booking Service (R) |
| getRoundTables() | GetRoundTables | `GET /rounds/:id/tables` | zone, table type, capacity, package price |
| updateRound() | UpdateRound `{round_id, …?, tables_not_for_sale?, prices?}` | `PUT /rounds/:id` | Draft: any field, derives the check-in window; Published: only what AF-3 allows (BRULE-07) (U) |
| validateRound() | ValidateRound | `POST /rounds/:id/validate` | UC-03 S-1 |
| publishRound() | PublishRound | `POST /rounds/:id/publish` | snapshots the parameters; gRPC CreateRoundTableStatus; idempotent |
| discardDraftRound() | DiscardDraftRound | `DELETE /rounds/:id` | Draft only (D) |
| getRoundPricing() | GetRoundPricing | — | the Booking Service: setPartySize() |
| getCheckInWindow() | GetCheckInWindow | — | the Booking Service: terms, ticket verification |

## Table Availability Service (gRPC :5003, `proto/table_availability.proto`)

The "gRPC service with CRUD" of Deliverable 3: `CreateRoundTableStatus` (C), `GetRoundTableStatus`,
`CountAvailableTables` (R), `HoldTable`, `ReleaseHold`, `MarkTableBooked`, `MarkTableOccupied` (U),
`RemoveRoundTableStatus` (D). The only route is the polled read `GET /rounds/:id/table-status` (ADR-09): the gateway
answers it with `ETag: <version>` and 304 when the poller's `If-None-Match` is the current version.

Status values: `AVAILABLE`, `HELD`, `BOOKED`, `OCCUPIED`, `NOT_FOR_SALE`. The service keeps the read model of the
table map (ADR-13): the Booking Service wins the hold in its own database (one active booking per table per round) and
then reports it with `HoldTable`; a transition from the wrong state answers `FAILED_PRECONDITION`. `ReleaseHold` on an
`AVAILABLE` table is a no-op (idempotent).

## Booking Service (gRPC :5002, `proto/booking.proto`)

The caller is the metadata `x-user-id`; every read is restricted to the caller's own bookings (FR-40).

| Operation (Table 5.3) | gRPC method | Route | Notes |
|---|---|---|---|
| createHeldBooking() | CreateHeldBooking `{round_id, table_number}` | `POST /bookings` | gRPC GetRound; the hold is won in the Booking DB (ADR-13), then HoldTable updates the map; FAILED_PRECONDITION → 409 when just taken (AF-3) |
| getBooking() | GetBooking `{booking_id}` | `GET /bookings/:id` | own bookings only |
| setPartySize() | SetPartySize `{booking_id, party_size}` | `PUT /bookings/:id/party-size` | computes the fee in the same call: gRPC GetRoundPricing (BRULE-08, BRULE-09) |
| getCustomerProfile() | GetCustomerProfile | `GET /customers/me` | NOT_FOUND → 404 on the first booking |
| createCustomerProfile() | CreateCustomerProfile `{name, phone, consent}` | `POST /customers/me` | FR-10; UC-09 AF-1, AF-2 |
| updateCustomerProfile() | UpdateCustomerProfile `{name?, phone?}` | `PUT /customers/me` | |
| getBookingTerms() | GetBookingTerms | `GET /bookings/:id/terms` | gRPC GetCheckInWindow |
| acceptBookingTerms() | AcceptBookingTerms | `POST /bookings/:id/terms-acceptance` | |
| startPayment() | StartPayment | `POST /bookings/:id/payment` | **UNIMPLEMENTED (501) in progress 1** (Payment Service later) |
| cancelBooking() | CancelBooking | `POST /bookings/:id/cancel` | gRPC ReleaseHold |
| getCustomerBookings() | GetCustomerBookings | `GET /customers/me/bookings` | My Bookings |
| getRoundBookings() | GetRoundBookings `{round_id}` | `GET /rounds/:id/bookings` | live view (manager, owner) |
| verifyBookingReference(), checkInBooking(), getETicket() | VerifyBookingReference, CheckInBooking, GetETicket | `POST /check-ins/verify`, `POST /check-ins`, `GET /bookings/:id/e-ticket` | UNIMPLEMENTED: progress 2; the e-ticket is issued inside confirmBookingPayment() |
| confirmBookingPayment() | ConfirmBookingPayment `{booking_id, payment_id, amount}` | — | the Payment Service, progress 2 |
| hold-expiry job | not an operation: every 5 s | — | gRPC ReleaseHold; the hold-expired notice is a log line for now |

## Payment Service (gRPC :5004, `proto/payment.proto`)

The Payment Gateway is simulated in progress 1 (ADR-11): the checkout URL is fake, and the gateway's callback is the
route `POST /payments/webhook`, accepted when its signature is `sim-<payment_id>`. Status values: `Pending`, `Paid`,
`Failed`. Confirming the booking (gRPC ConfirmBookingPayment) and the payment-failed notice come in progress 2.

| Operation | gRPC method | Route | Notes |
|---|---|---|---|
| createPaymentRequest() | CreatePaymentRequest `{booking_id, amount, customer_id}` | — | the Booking Service: startPayment() (progress 2); a Pending payment and `checkout_url` `https://checkout.example/pay/<payment_id>` (C) |
| receivePaymentResult() | ReceivePaymentResult `{payment_id, status, amount, signature}` | `POST /payments/webhook` | wrong signature → INVALID_ARGUMENT; amount ≠ requested → FAILED_PRECONDITION; Paid or Failed recorded once, a duplicate answers `{accepted: true}` (U) |
| getPaymentStatus() | GetPaymentStatus `{payment_id}` | `GET /payments/:id` | `{payment_id, booking_id, status, amount}`; NOT_FOUND when unknown (R) |

## Notification Service (gRPC :5005, `proto/notification.proto`)

No route: the services call it. The LINE Messaging Adapter is a stub in progress 1: each notice is recorded and logged as
`[notification] LINE push to <customer_id>: <kind>`, and the result is `{message_id, delivered: true}`.

| Operation | gRPC method | Route | Notes |
|---|---|---|---|
| sendBookingConfirmation() | SendBookingConfirmation `{customer_id, booking_id, round_name, table_number}` | — | the Booking Service: confirmBookingPayment() (progress 2) |
| sendHoldExpiredNotice() | SendHoldExpiredNotice (same request) | — | the Booking Service: hold-expiry job (progress 2) |
| sendPaymentFailedNotice() | SendPaymentFailedNotice (same request) | — | the Payment Service (progress 2) |

## Staff Account Service (gRPC :5006, `proto/staff_account.proto`)

Staff sessions (ADR-07) and the accounts of the back-office. Roles: `manager`, `front_staff`, `owner` (Table 6.11 of the project document);
status `Active` or `Disabled`. Progress 1 seeds `manager/manager`, `door1/door1` (front_staff) and `owner/owner`; the
staff routes still trust the `x-user-id` / `x-role` headers, checking the bearer token comes in progress 2.

| Operation | gRPC method | Route | Notes |
|---|---|---|---|
| signIn() | SignIn `{username, password}` | `POST /sessions` | `{token, role, staff_account_id}`; UNAUTHENTICATED (401) on a wrong password or a Disabled account |
| signOut() | SignOut `{token}` | `DELETE /sessions/current` | ends the session; idempotent |
| createStaffAccount() | CreateStaffAccount `{username, role, password}` | `POST /staff-accounts` | taken username → FAILED_PRECONDITION (C) |
| listStaffAccounts() | ListStaffAccounts | `GET /staff-accounts` | (R) |
| updateStaffAccount() | UpdateStaffAccount `{staff_account_id, role?, password?}` | `PUT /staff-accounts/:id` | a field left out is unchanged (U) |
| disableStaffAccount() | DisableStaffAccount `{staff_account_id}` | `DELETE /staff-accounts/:id` | status Disabled, its sessions end; idempotent (D) |
