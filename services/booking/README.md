# Booking Service

The booking context: the booking from Held to Checked-in, the customer profile, the booking terms and the e-ticket
(Booking DB). The booking is the source of truth of the hold: at most one active booking per table per round, enforced by
a unique index (in memory: a check-and-insert), and every transition is appended to the booking's history (ADR-13); the
Table Availability Service only keeps the read model. Its only API is gRPC :5002 (`proto/booking.proto`), called by the
gateway for the customer and staff routes (`docs/contracts.md`) with the caller in the metadata `x-user-id`; it is a
gRPC client of the Concert Round Service (GetRound, GetRoundPricing, GetCheckInWindow) and of the Table Availability
Service (HoldTable, ReleaseHold, MarkTableBooked, MarkTableOccupied). Its own job expires unpaid holds every 5 s (ADR-08).

- `src/domain/` — the pure core: the model, one function per operation of Table 5.3 in one file per use case (`booking.ts`
  UC-01, `expiry.ts` UC-01 EF-1, `profile.ts` UC-09, `progress2.ts` answers UNIMPLEMENTED), the repository interfaces and
  the ports (`ports.ts`) through which the rules reach the outside; `index.ts` is the barrel the callers import.
- `src/infrastructure/` — what the ports are bound to by `wire()` of `index.ts`: the repositories over `Collection<T>`
  (`repositories.ts`), the Booking DB in memory or MongoDB (`store.ts`, ADR-06) and the two gRPC clients, each call with a
  deadline, a collaborator that does not answer an InfrastructureError (`clients.ts`).
- `src/api/` — the API layer, one function per method of the proto (`handlers.ts`), and the gRPC server, one handler each,
  the failures mapped to gRPC statuses by `@seats/errors` (`grpc.ts`).
- `src/server.ts` — the composition root: connects the store, wires the ports, starts the server and the expiry job.
