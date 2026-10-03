# Booking Service (owner: Peat SE)

The booking context: the booking from Held to Checked-in, the customer profile, the booking terms and the e-ticket
(Booking DB). The booking is the source of truth of the hold: at most one active booking per table per round, enforced by
a unique index (in memory: a check-and-insert), and every transition is appended to the booking's history (ADR-13); the
Table Availability Service only keeps the read model. Its only API is gRPC :5002 (`proto/booking.proto`), called by the
gateway for the customer and staff routes (`docs/contracts.md`) with the caller in the metadata `x-user-id`; it is a
gRPC client of the Concert Round Service (GetRound, GetRoundPricing, GetCheckInWindow) and of the Table Availability
Service (HoldTable, ReleaseHold, MarkTableBooked, MarkTableOccupied). Its own job expires unpaid holds every 5 s (ADR-08).

- `src/domain/` — one function per operation of Table 5.3, one file per use case (`booking.ts` UC-01, `expiry.ts` UC-01 EF-1,
  `profile.ts` UC-09, `progress2.ts` answers UNIMPLEMENTED); `src/domain.ts` is the barrel the callers import.
- `src/repository.ts` — one repository per aggregate (bookings, profiles) plus the table lock, over `Collection<T>`.
- `src/api.ts` — the API layer, one function per method of the proto; `src/grpc.ts` — the server, one handler each, the
  failures mapped to gRPC statuses by `@seats/errors`.
- `src/clients.ts` — the two gRPC clients, each call with a deadline; a collaborator that does not answer is an InfrastructureError.
- `src/store.ts` — the Booking DB: in memory, or MongoDB when configured (ADR-06).
