# Table Availability Service (owner: Will)

Keeps the read model of the table map: the status of every table of every published round (Table Status DB), created
when a round is published and updated by the Booking Service after each booking transition (ADR-13). The hold itself
is won in the Booking DB. Its only API is gRPC :5003 (`proto/table_availability.proto`); the polled read of the web
apps (ADR-09) is `GetRoundTableStatus`, which the gateway serves as `GET /api/rounds/:id/table-status` with an ETag.

- `src/domain.ts` — one function per operation of Table 5.3, plus `removeRoundTableStatus()` (the D of CRUD).
- `src/repository.ts` — `RoundTableStatusRepository`, the domain's only access to the Table Status DB (one document per round).
- `src/store.ts` — the Table Status DB, in memory or on MongoDB by configuration (ADR-06).
- `src/grpc.ts`, `src/server.ts` — transport only, no rules.
