# Concert Round Service

The venue and events context: zone maps, table types, concert rounds, package prices and the business parameters
(Round DB). Its only API is gRPC :5001 (`proto/concert_round.proto`): the gateway maps the back-office and customer
routes onto it (`docs/contracts.md`), and the Booking Service calls its three reads. Calls the Table Availability
Service by gRPC when a round is published and for the sold-out status and booked tables.

- `src/domain/` — the pure core: `model.ts` (the types of the Round DB), `repository.ts` (the repository interfaces,
  one per aggregate, in the words of the domain), `ports.ts` (what the rules need from outside — the repositories, the
  Media Storage port, the Table Availability client — and the `ports` holder they call), one file per use case
  (`business-parameters.ts` UC-07, `table-types.ts` FR-37, `zone-maps.ts` UC-04, `rounds.ts` UC-03 with publishing,
  `shared.ts` the helpers they share, not exported) and `index.ts`, the barrel. Imports only `@seats/errors` and the
  message types of `@seats/proto`; every operation awaits the Round DB and answers a promise.
- `src/infrastructure/` — the implementations of the ports: `store.ts` (the Round DB over `@seats/store`, ADR-06),
  `repositories.ts` (the repositories over `collection<T>()`; nothing else touches a collection), `adapters.ts` (the
  Media Storage Adapter and its fake), `clients.ts` (the gRPC client of the Table Availability Service, every call with
  a deadline) and `index.ts`, whose `wire()` binds them to the domain's ports through delegates, so a test that swaps
  the adapter and the monolith that patches the client object are followed.
- `src/api/` — `handlers.ts`, one function per method of `concert_round.proto`, request message in, response message
  out, the domain's failures mapped by `toServiceError`; `grpc.ts`, the gRPC server over the handlers plus the health check.
- `src/server.ts` — the composition root: `connectStore()`, `wire()`, `startGrpc()`.

Failures are the classes of `@seats/errors` (`packages/errors`): a rule that says no is a `DomainError` whose `kind`
(`invalid`, `not_found`, `conflict`, `not_implemented`) the shared `toServiceError()` maps to the gRPC status and the
gateway to HTTP 400/404/409/501; a dependency that does not answer (the object storage behind the Media Storage
Adapter, the Table Availability Service, MongoDB) is an `InfrastructureError` naming the `system`, answered as
UNAVAILABLE (HTTP 502); anything else is a defect, logged under a reference and answered as INTERNAL. The domain knows
the kinds only, never a status code.

The "REST service with CRUD" of Deliverable 3 is the gateway's REST API over this service: zone maps and rounds are
created, read, updated and deleted with curl through `:4000`, and the gateway log shows the gRPC call behind each.

## Persistence (ADR-06)

`server.ts` (and `monolith/src/server.ts`) `await connectStore()` before serving. The implementation is chosen from the
environment: `CONCERT_ROUND_MONGO_URL` is used as given; otherwise `MONGO_URL` names the cluster and this service takes
its own database `seats_concert_round` on it; with neither, the Round DB is in memory (development, the tests, the
free-plan demo deployment). On MongoDB (through Mongoose) every read and write goes to the database — there is no cache
in front of it, so a restarted process simply reads what is there — and `insert()` is atomic (the unique `_id` index;
the in-memory store refuses a second insert the same way).

```bash
docker compose up -d mongo-concert-round    # mongo:7 on the compose network, a named volume
CONCERT_ROUND_MONGO_URL=mongodb://localhost:27017/concert-round npm -w services/concert-round run dev
```

`docker-compose.yml` already wires `mongo-concert-round` and the connection string for the containerised service, and
setting the env var on the Render deployment (`services/concert-round` → `monolith`) persists the Round DB there as
well, with no code change.

The tests of this service run in memory and never need a database. The contract test of the store itself — the same
suite against the in-memory implementation always and against MongoDB when `TEST_MONGO_URL` names one — lives in
`packages/store/test/store.test.ts` (`npm -w packages/store test`).
