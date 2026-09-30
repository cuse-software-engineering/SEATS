# Booking Service (owner: Peat SE)

The booking context: the booking from Held to Checked-in, the customer profile, the booking terms and the e-ticket
(Booking DB). REST :4002 for the customer flow through the gateway (route table in `docs/contracts.md`); gRPC client of
the Concert Round Service (GetRound, GetRoundPricing, GetCheckInWindow) and of the Table Availability Service
(HoldTable, ReleaseHold, MarkTableBooked, MarkTableOccupied). Its own job expires unpaid holds every 5 s (ADR-08).

- `src/domain.ts` — one function per operation of Table 5.3; the progress 2 operations answer 501.
- `src/clients.ts` — the two gRPC clients, each call with a deadline.
- `src/store.ts` — in-memory store (swap for Mongoose, ADR-06).
