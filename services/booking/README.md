# Booking Service (owner: Peat SE)

The booking context: the booking from Held to Checked-in, the customer profile, the booking terms and the e-ticket
(Booking DB). The booking is the source of truth of the hold: at most one active booking per table per round, enforced by
a unique index (in memory: a check-and-insert), and every transition is appended to the booking's history (ADR-13); the
Table Availability Service only keeps the read model. Its only API is gRPC :5002 (`proto/booking.proto`), called by the
gateway for the customer and staff routes (`docs/contracts.md`) with the caller in the metadata `x-user-id`; it is a
gRPC client of the Concert Round Service (GetRound, GetRoundPricing, GetCheckInWindow) and of the Table Availability
Service (HoldTable, ReleaseHold, MarkTableBooked, MarkTableOccupied). Its own job expires unpaid holds every 5 s (ADR-08).

- `src/domain.ts` — one function per operation of Table 5.3; the progress 2 operations answer UNIMPLEMENTED.
- `src/grpc.ts` — the server: one handler per operation, DomainError mapped to a gRPC status.
- `src/clients.ts` — the two gRPC clients, each call with a deadline.
- `src/store.ts` — in-memory store (swap for Mongoose, ADR-06).
