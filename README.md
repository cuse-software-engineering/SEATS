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
| Payment Service | `services/payment/` | — | gRPC :5004 (payment requests and the results of the simulated Payment Gateway, ADR-11) |
| Notification Service | `services/notification/` | — | gRPC :5005 (the LINE notices of a booking; logs instead of pushing) |
| Staff Account Service | `services/staff-account/` | — | gRPC :5006 (staff sign-in sessions and staff accounts, ADR-07; seeded accounts) |
| Demo scripts, smoke test | `demo/` | Peat CS | curl / grpcurl / node |
| Contracts | `proto/`, `docs/contracts.md`, `docs/openapi.yaml` | everyone, reviewed by Will | |
| Customer Web App | `frontend/customer-web-app/` | Peat CS | Vite + React on :5173: the screens C1 to C9 of Appendix D of the project document |
| Back-office Web App | `frontend/back-office-web-app/` | Peat CS | Vite + React on :5174: the screens B1 to B7 |
| Shared client | `frontend/shared/` | Peat CS | the typed API client, generated from `docs/openapi.yaml` (openapi-typescript) |

The design is contract-first: every service has exactly one API, gRPC, and its `.proto` file is agreed before code;
the gateway's route table in [docs/contracts.md](docs/contracts.md) maps each REST route onto one gRPC method, and
[docs/openapi.yaml](docs/openapi.yaml) is the same public API as an OpenAPI document, from which the web apps take their types. The
operation names are those of Table 5.3 of the project document, one function per operation (ADR-12: REST at the API
Gateway only, gRPC inside the Backend). The "REST service with CRUD" of the brief is the gateway's REST API over the
Concert Round Service; the "gRPC service with CRUD" is the Table Availability Service called directly with grpcurl.

## Run

```bash
npm install                 # one install for all workspaces
npm run dev                 # all seven processes from the TypeScript sources (tsx), coloured logs, Ctrl-C stops all
npm run smoke               # the two flows end to end against the gateway (services must be running)
npm run typecheck           # tsc on every package; run before a PR
npm test                    # node:test: the unit tests of every service and the in-process end-to-end flows (69)
npm run dev:mono            # monolith mode (ADR-14): the gateway and the six services in ONE process, calls in memory
npm run dev:customer        # the Customer Web App on :5173 (proxies /api to the gateway)
npm run dev:backoffice      # the Back-office Web App on :5174; sign in with manager/manager
npm run build:frontend      # production build of the shared client and both apps
npm test                    # unit tests of every service (node:test, the collaborators stubbed); no service needs to run
npm run proto               # regenerate proto/gen/ after a change to a .proto file (commit the result)
demo/rest-demo.sh           # the same flow as readable curl calls through the gateway (needs jq)
demo/grpc-demo.sh           # CRUD on the Table Availability Service with grpcurl
docker compose up --build   # the same seven processes as containers (compiled with tsc in the image)
```

TypeScript throughout (ES modules, `strict`). Each service has `src/model.ts` (its data model, see
[docs/data-model.md](docs/data-model.md)), `src/domain.ts` (one function per operation of Table 5.3), `src/store.ts`
(in-memory, typed), the transports `src/grpc.ts` (its server) and `src/clients.ts` (the services it calls), and
`test/` (node:test on `domain.ts`, the clients replaced by stubs). The
gRPC types come from the `.proto` files (`proto/gen/`, generated), so a contract change is a compile error in every
caller, the gateway included: its request builders are typed against the request messages.

Every service serves the standard `grpc.health.v1.Health/Check`; the gateway's `GET /health` calls each of them. The
web apps are not part of progress 1: the demo uses curl and grpcurl.

## Monolith mode (ADR-14)

`npm run dev:mono` runs the whole backend as one process: the gateway's REST API on :4000 and the six services loaded
into the same process, every call a function call. Nothing else changes: the same route table, the same `.proto`
contracts, and every request and response still passes through the Protocol Buffers serializer of its method in
memory, so defaults, optional fields and error codes behave exactly as over gRPC. Only the network, the deadlines and
`UNAVAILABLE` are gone. Use it to debug a flow with one log and one stack trace, and for the end-to-end tests in
`monolith/test/`, which `npm test` runs in milliseconds without ports or containers.

How it works: each service has `src/api.ts`, its API layer (one function per method of its `.proto`, request message
in, response message out), which `src/grpc.ts` serves over gRPC. `monolith/src/wire.ts` is the one composition root
that knows every service: it points the client objects of the gateway and of the services at the API layers of the
other services (`monolith/src/inprocess.ts`). No service imports another service. The monolith is never the
deployment target: the MVP is deployed as the seven processes of `docker-compose.yml`, and `npm run smoke` against
them stays the check that serialization, metadata and deadlines behave over the wire.

## Progress 1 stubs (say so in the video)

- **Auth**: the gateway trusts the headers `x-user-id` and `x-role` (`customer`, `manager`, `front_staff`, `owner`)
  and passes them to the services as gRPC metadata. LINE Login (ADR-01) comes later. Staff can already sign in
  (`POST /api/sessions`) at the **Staff Account Service**, which seeds `manager/manager`, `door1/door1` (front_staff)
  and `owner/owner`; the staff routes do not check the token yet.
- **Storage**: each service keeps its data in memory behind `src/store.ts`; swap it for Mongoose models (ADR-06)
  without touching `domain.ts`.
- **Payment**: the **Payment Service** is the simulated Payment Gateway (ADR-11): the checkout URL is fake and the
  result is posted to `POST /api/payments/webhook` with the signature `sim-<payment_id>`. The Booking Service's
  startPayment() still answers 501: wiring it to the Payment Service comes in progress 2.
- **Notifications**: the **Notification Service** records each notice and logs `[notification] LINE push to …` instead
  of calling the LINE Messaging API; the Booking Service does not call it yet.
- **Not built yet**: check-in, media upload (the adapter returns a URL).

## Git

One PR per service into `main`, reviewed by Will. Commit under your own name: contribution is graded per person.
