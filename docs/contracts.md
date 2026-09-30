# Contracts

Agreed before code (tasks.txt, section 2). Operation names are those of Table 5.3 of the project document. The shape of
every body is a type of the owning service's `src/model.ts`, derived from the data model in [data-model.md](data-model.md).
Every REST call goes through the API Gateway, which strips `/api` and forwards to the owning service with the headers
`x-user-id` and `x-role` (fake auth in progress 1). A service never calls another service's REST API: it uses gRPC.

## API Gateway (REST :4000)

| Method and path | Forwarded to | Role |
|---|---|---|
| `/api/zone-maps…`, `/api/table-types…`, `/api/business-parameters` | Concert Round Service | read: manager, owner; write: manager |
| `/api/rounds…` | Concert Round Service | read: everyone; write: manager |
| `/api/rounds/:id/table-status` | Table Availability Service | read: everyone |
| `/api/bookings…`, `/api/customers/me…` | Booking Service | customer (manager and owner may read `/api/rounds/:id/bookings`) |

## Concert Round Service (REST :4001, gRPC :5001)

| Operation (Table 5.3) | REST | Notes |
|---|---|---|
| createZoneMap() | `POST /zone-maps` `{name}` | new Draft map |
| listZoneMaps() | `GET /zone-maps?status=Active` | |
| getZoneMap() | `GET /zone-maps/:id` | with tables and capacity per zone |
| updateZoneMap() | `PUT /zone-maps/:id` `{name?, zones?, tables?}` | Draft: anything; Active: AF-1 rules |
| uploadZoneMapImage() | `POST /zone-maps/:id/image` `{fileName}` | Media Storage Adapter stub returns the URL |
| validateZoneMap() | `POST /zone-maps/:id/validate` | UC-04 S-1; answers `{valid, problems}` |
| activateZoneMap() | `POST /zone-maps/:id/activate` | validates first; idempotent |
| discardDraftZoneMap() | `DELETE /zone-maps/:id` | Draft only (the D of CRUD) |
| defineTableType() | `PUT /table-types/:id` `{name, capacity, packageContent}` | venue table types |
| listTableTypes() | `GET /table-types` | |
| getBusinessParameters() | `GET /business-parameters` | |
| updateBusinessParameters() | `PUT /business-parameters` | hold period, check-in window, grace period, extra-person fee |
| createRound() | `POST /rounds` `{name?}` | new Draft round |
| updateRound() | `PUT /rounds/:id` | Draft: any field, derives the check-in window; Published: only what AF-3 allows (BRULE-07) |
| validateRound() | `POST /rounds/:id/validate` | UC-03 S-1 |
| publishRound() | `POST /rounds/:id/publish` | snapshots the parameters; gRPC CreateRoundTableStatus |
| discardDraftRound() | `DELETE /rounds/:id` | Draft only |
| getUpcomingRounds() | `GET /rounds` | status not yet open / open / sold out (gRPC CountAvailableTables) |
| getRound() | `GET /rounds/:id` | |
| getRoundTables() | `GET /rounds/:id/tables` | zone, table type, capacity, package price |
| getRoundPricing() | gRPC only | |
| getCheckInWindow() | gRPC only | |

gRPC (`proto/concert_round.proto`): `GetRound`, `GetRoundPricing`, `GetCheckInWindow`.

## Table Availability Service (gRPC :5003, REST :4003)

gRPC (`proto/table_availability.proto`): `CreateRoundTableStatus` (C), `GetRoundTableStatus`,
`CountAvailableTables` (R), `HoldTable`, `ReleaseHold`, `MarkTableBooked`, `MarkTableOccupied` (U),
`RemoveRoundTableStatus` (D).

| Operation | REST | Notes |
|---|---|---|
| getRoundTableStatus() | `GET /rounds/:id/table-status` | polled every 2 s by the web apps (ADR-09); `If-None-Match: <version>` gets 304 |

Status values: `AVAILABLE`, `HELD`, `BOOKED`, `OCCUPIED`, `NOT_FOR_SALE`. The service keeps the read model of the
table map (ADR-13): the Booking Service wins the hold in its own database (one active booking per table per round) and
then reports it with `HoldTable`; a transition from the wrong state answers `FAILED_PRECONDITION`. `ReleaseHold` on an
`AVAILABLE` table is a no-op (idempotent).

## Booking Service (REST :4002)

| Operation (Table 5.3) | REST | Notes |
|---|---|---|
| createHeldBooking() | `POST /bookings` `{roundId, tableNumber}` | gRPC GetRound; the hold is won in the Booking DB (ADR-13), then HoldTable updates the map; 409 when just taken (AF-3) |
| getBooking() | `GET /bookings/:id` | own bookings only |
| setPartySize() | `PUT /bookings/:id/party-size` `{partySize}` | computes the fee in the same request: gRPC GetRoundPricing (BRULE-08, BRULE-09) |
| getCustomerProfile() | `GET /customers/me` | 404 on the first booking |
| createCustomerProfile() | `POST /customers/me` `{name, phone, consent}` | FR-10; AF-7 validation |
| updateCustomerProfile() | `PUT /customers/me` | |
| getBookingTerms() | `GET /bookings/:id/terms` | gRPC GetCheckInWindow |
| acceptBookingTerms() | `POST /bookings/:id/terms-acceptance` | |
| startPayment() | `POST /bookings/:id/payment` | **501 in progress 1** (Payment Service later) |
| cancelBooking() | `POST /bookings/:id/cancel` | gRPC ReleaseHold |
| getCustomerBookings() | `GET /customers/me/bookings` | My Bookings |
| getRoundBookings() | `GET /rounds/:id/bookings` | live view (manager, owner) |
| verifyBookingReference(), checkInBooking(), getETicket() | `501` | progress 2; the e-ticket is issued inside confirmBookingPayment() |
| hold-expiry job | not an operation: every 5 s | gRPC ReleaseHold; the hold-expired notice is a log line for now |

Errors: JSON `{error: "…"}` with 400 (invalid input), 403 (role), 404, 409 (rule broken, e.g. table just taken), 501.
