# Table Availability Service (owner: Will)

Keeps the read model of the table map: the status of every table of every published round (Table Status DB), created
when a round is published and updated by the Booking Service after each booking transition (ADR-13). The hold itself
is won in the Booking DB. Whole API is gRPC (`proto/table_availability.proto`); the one REST call is the polled read
`GET /rounds/:id/table-status` (ADR-09). Ports: gRPC 5003, REST 4003.

- `src/domain.ts` — one function per operation of Table 5.3, plus `removeRoundTableStatus()` (the D of CRUD).
- `src/store.ts` — in-memory store; replace by a Mongoose model, one document per round.
- `src/grpc.ts`, `src/rest.ts`, `src/server.ts` — transport only, no rules.
