# Table Availability Service (owner: Will)

Keeps the read model of the table map: the status of every table of every published round (Table Status DB), created
when a round is published and updated by the Booking Service after each booking transition (ADR-13). The hold itself
is won in the Booking DB. Its only API is gRPC :5003 (`proto/table_availability.proto`); the polled read of the web
apps (ADR-09) is `GetRoundTableStatus`, which the gateway serves as `GET /api/rounds/:id/table-status` with an ETag.

- `src/domain/` — the pure core: the model, the rules of the table map (one function per operation of Table 5.3, plus `removeRoundTableStatus()`, the D of CRUD) and the ports they call (`RoundTableStatusRepository`, the domain's only access to the Table Status DB); imports nothing of the other layers.
- `src/infrastructure/` — the Table Status DB (in memory or on MongoDB by configuration, ADR-06), the repository over it and `wire()`, which binds it to the domain's ports.
- `src/api/` — one handler per method of `table_availability.proto` and the gRPC server around them; transport only, no rules.
- `src/server.ts` — connects the store, wires the ports and starts the gRPC server.
