# SEATS — Seating & Event Availability Tracking System

Implementation of the microservice design in the project document of group SE 101 (2110521 Software Architecture,
`2110521_Software_Architecture/assignments/group/workspace/report/project-document/`). Deliverable 3 (progress 1)
builds the MVP services of the two demo flows, **Create Zone Map + Create Round** and **Create Booking**.

| Part | Folder | Owner | API |
|---|---|---|---|
| API Gateway | `gateway/` | Will | REST :4000, the only REST API (the web apps' entry; fake auth by headers); each route is one gRPC call |
| Concert Round Service | `services/concert-round/` | Natchy | gRPC :5001 (zone maps, table types, rounds, parameters: CRUD) |
| Table Availability Service | `services/table-availability/` | Will | gRPC :5003 (CRUD on the table-map read model, ADR-13) |
| Booking Service | `services/booking/` | Peat SE | gRPC :5002 (customer flow) + gRPC client of the two above |
| Demo scripts, smoke test | `demo/` | Peat CS | curl / grpcurl / node |
| Contracts | `proto/`, `docs/contracts.md` | everyone, reviewed by Will | |

The design is contract-first: every service has exactly one API, gRPC, and its `.proto` file is agreed before code;
the gateway's route table in [docs/contracts.md](docs/contracts.md) maps each REST route onto one gRPC method. The
operation names are those of Table 5.3 of the project document, one function per operation (ADR-12: REST at the API
Gateway only, gRPC inside the Backend). The "REST service with CRUD" of the brief is the gateway's REST API over the
Concert Round Service; the "gRPC service with CRUD" is the Table Availability Service called directly with grpcurl.

## Run

```bash
npm install                 # one install for all workspaces
npm run dev                 # all four processes from the TypeScript sources (tsx), coloured logs, Ctrl-C stops all
npm run smoke               # the two flows end to end against the gateway (services must be running)
npm run typecheck           # tsc on every package; run before a PR
npm run proto               # regenerate proto/gen/ after a change to a .proto file (commit the result)
demo/rest-demo.sh           # the same flow as readable curl calls through the gateway (needs jq)
demo/grpc-demo.sh           # CRUD on the Table Availability Service with grpcurl
docker compose up --build   # the same four processes as containers (compiled with tsc in the image)
```

TypeScript throughout (ES modules, `strict`). Each service has `src/model.ts` (its data model, see
[docs/data-model.md](docs/data-model.md)), `src/domain.ts` (one function per operation of Table 5.3), `src/store.ts`
(in-memory, typed), and the transports `src/grpc.ts` (its server) and `src/clients.ts` (the services it calls). The
gRPC types come from the `.proto` files (`proto/gen/`, generated), so a contract change is a compile error in every
caller, the gateway included: its request builders are typed against the request messages.

Every service serves the standard `grpc.health.v1.Health/Check`; the gateway's `GET /health` calls each of them. The
web apps are not part of progress 1: the demo uses curl and grpcurl.

## Progress 1 stubs (say so in the video)

- **Auth**: the gateway trusts the headers `x-user-id` and `x-role` (`customer`, `manager`, `front_staff`, `owner`)
  and passes them to the services as gRPC metadata. LINE Login (ADR-01) and staff sessions (ADR-07, Staff Account
  Service) come later.
- **Storage**: each service keeps its data in memory behind `src/store.ts`; swap it for Mongoose models (ADR-06)
  without touching `domain.ts`.
- **Not built yet**: Payment Service (startPayment answers 501), Notification Service (the log line says what would
  be sent), Staff Account Service, check-in, media upload (the adapter returns a URL).

## Git

One PR per service into `main`, reviewed by Will. Commit under your own name: contribution is graded per person.
