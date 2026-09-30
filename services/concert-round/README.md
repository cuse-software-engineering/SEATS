# Concert Round Service (owner: Natchy)

The venue and events context: zone maps, table types, concert rounds, package prices and the business parameters
(Round DB). Its only API is gRPC :5001 (`proto/concert_round.proto`): the gateway maps the back-office and customer
routes onto it (`docs/contracts.md`), and the Booking Service calls its three reads. Calls the Table Availability
Service by gRPC when a round is published and for the sold-out status and booked tables.

- `src/domain.ts` — one function per operation of Table 5.3, plus `discardDraftZoneMap()` and `discardDraftRound()`.
- `src/store.ts` — in-memory store (swap for Mongoose, ADR-06).
- `src/model.ts`, `src/grpc.ts`, `src/clients.ts`, `src/server.ts` — transport only.

The "REST service with CRUD" of Deliverable 3 is the gateway's REST API over this service: zone maps and rounds are
created, read, updated and deleted with curl through `:4000`, and the gateway log shows the gRPC call behind each.
