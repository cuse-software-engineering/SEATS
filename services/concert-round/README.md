# Concert Round Service (owner: Natchy)

The venue and events context: zone maps, table types, concert rounds, package prices and the business parameters
(Round DB). REST :4001 for the back-office through the gateway (route table in `docs/contracts.md`); gRPC :5001 for
the three reads of the Booking Service (`proto/concert_round.proto`). Calls the Table Availability Service by gRPC
when a round is published and for the sold-out status and booked tables.

- `src/domain.js` — one function per operation of Table 5.3, plus `discardDraftZoneMap()` and `discardDraftRound()`.
- `src/store.js` — in-memory store (swap for Mongoose, ADR-06).
- `src/rest.js`, `src/grpc.js`, `src/clients.js`, `src/server.js` — transport only.

This is the "REST service with CRUD" of Deliverable 3: zone maps and rounds are created, read, updated and deleted.
