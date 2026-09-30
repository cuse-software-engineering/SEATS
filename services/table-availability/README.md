# Table Availability Service (owner: Will)

Owns the status of every table of every published round (Table Status DB) and the rule that only one hold or booking
exists per table per round (BRULE-03, ADR-08). Whole API is gRPC (`proto/table_availability.proto`); the one REST
call is the polled read `GET /rounds/:id/table-status` (ADR-09). Ports: gRPC 5003, REST 4003.

- `src/domain.ts` — one function per operation of Table 5.3, plus `removeRoundTableStatus()` (the D of CRUD).
- `src/store.ts` — in-memory store; replace by a Mongoose model with `findOneAndUpdate({status: 'AVAILABLE'})` for `holdTable()`.
- `src/grpc.ts`, `src/rest.ts`, `src/server.ts` — transport only, no rules.
