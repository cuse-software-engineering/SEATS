# Concert Round Service (owner: Natchy)

The venue and events context: zone maps, table types, concert rounds, package prices and the business parameters
(Round DB). Its only API is gRPC :5001 (`proto/concert_round.proto`): the gateway maps the back-office and customer
routes onto it (`docs/contracts.md`), and the Booking Service calls its three reads. Calls the Table Availability
Service by gRPC when a round is published and for the sold-out status and booked tables.

- `src/domain.ts` — one function per operation of Table 5.3, plus `discardDraftZoneMap()` and `discardDraftRound()`.
- `src/store.ts` — the Round DB (ADR-06): an in-memory cache with the exact same `get`/`put`/`delete`/`list`
  interface as before, so `domain.ts` is unchanged and every existing test still runs with no MongoDB of its own.
  `connectStore()` opens a MongoDB connection, hydrates the cache from it, and from then on every `put()`/`delete()`
  is mirrored to MongoDB in the background (best effort — the caller already has its answer from the cache; a failed
  write is logged, not thrown). With no connection string the service runs exactly as it always did, in memory only.
- `src/model.ts`, `src/grpc.ts`, `src/clients.ts`, `src/server.ts` — transport only.

The "REST service with CRUD" of Deliverable 3 is the gateway's REST API over this service: zone maps and rounds are
created, read, updated and deleted with curl through `:4000`, and the gateway log shows the gRPC call behind each.

## Persistence (ADR-06)

`server.ts` calls `connectStore()` before it starts serving. Set `CONCERT_ROUND_MONGO_URL` (or the generic
`MONGO_URL`) to a MongoDB connection string to turn persistence on:

```bash
docker compose up -d mongo-concert-round    # mongo:7 on the compose network, a named volume
CONCERT_ROUND_MONGO_URL=mongodb://localhost:27017/concert-round npm -w services/concert-round run dev
```

`docker-compose.yml` already wires `mongo-concert-round` and the connection string for the containerised service;
`monolith/src/server.ts` calls the same `connectStore()` too, so setting the env var on the Render deployment
(`services/concert-round` → `monolith`) persists the Round DB there as well, with no code change.

Run the persistence tests themselves against a real MongoDB (they are skipped otherwise, so the rest of `npm test`
never needs a database):

```bash
docker run --rm -p 27018:27017 mongo:7
TEST_MONGO_URL=mongodb://localhost:27018/concert-round-test npm -w services/concert-round test
```
