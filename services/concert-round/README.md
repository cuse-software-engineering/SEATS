# Concert Round Service (owner: Natchy)

The venue and events context: zone maps, table types, concert rounds, package prices and the business parameters
(Round DB). Its only API is gRPC :5001 (`proto/concert_round.proto`): the gateway maps the back-office and customer
routes onto it (`docs/contracts.md`), and the Booking Service calls its three reads. Calls the Table Availability
Service by gRPC when a round is published and for the sold-out status and booked tables.

- `src/domain/` — one function per operation of Table 5.3, plus `discardDraftZoneMap()` and `discardDraftRound()`,
  one file per use case: `business-parameters.ts` (UC-07), `table-types.ts` (FR-37), `zone-maps.ts` (UC-04),
  `rounds.ts` (UC-03, publishing included), `shared.ts` (the helpers they share, not exported) and `index.ts`, the
  barrel; `src/domain.ts` re-exports that barrel so every caller keeps importing `./domain.js`. Every operation is
  asynchronous: it awaits the Round DB and answers a promise.
- `src/repository.ts` — one repository per aggregate (`zoneMaps`, `tableTypes`, `rounds`) and one for the single
  `businessParameters` document, each an interface in the words of the domain (`get`, `save`, `remove`, `all`,
  `withStatus`, `published`, `publishedOnMap`) implemented once over `collection<T>()` of `store.ts`; the domain
  imports these objects and never a collection.
- `src/store.ts` — the Round DB (ADR-06): binds this service to the shared repository package `@seats/store`
  (`packages/store`). `repository.ts` takes `collection<T>(name)` handles at module load and talks to the
  `get`/`put`/`insert`/`delete`/`list`/`find` contract only; which implementation answers (MongoDB or memory) is
  chosen once, by `connectStore()` at start-up, so the domain and every test are the same against both. Reads answer
  copies, so an operation that changes a document `save()`s it back.
- `src/model.ts`, `src/grpc.ts`, `src/clients.ts`, `src/server.ts` — transport only.

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
