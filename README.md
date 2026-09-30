# SEATS — Seating & Event Availability Tracking System

SEATS lets the customers of a live-music bar reserve a specific table for a concert round from a LINE web app: pick
the round, pick a free table on the venue's zone map, hold it for 15 minutes, pay the full table fee and receive an
e-ticket; at the door the staff scan the ticket. The venue's staff run the back-office: zone maps, table types,
concert rounds and prices, a live view of the tables on the night, business parameters and staff accounts.

This repository implements the microservice design of the project document of group SE 101 (2110521 Software
Architecture): the same names, contracts and decisions, so that the document and the code can be read side by side.
Who builds what and how we work is in [docs/team.md](docs/team.md).

## Architecture

Three parts: the **Frontend** (two web apps), the **Backend** (an API Gateway and six services, each with its own
store) and the **external systems** (LINE, the Payment Gateway, object storage), reached only through adapters.

| Component | Folder | Port | Role |
|---|---|---|---|
| API Gateway | `gateway/` | REST :4000 | the only REST API; authenticates the caller, checks the role of the route and turns each call into one gRPC call |
| Concert Round Service | `services/concert-round/` | gRPC :5001 | the venue and its events: zone maps, table types, rounds, prices, business parameters |
| Table Availability Service | `services/table-availability/` | gRPC :5003 | the read model of the table map: the status of every table of every round, polled by the web apps |
| Booking Service | `services/booking/` | gRPC :5002 | the booking from Held to Checked-in; it owns the hold (first lock wins), the customer profile and the terms |
| Payment Service | `services/payment/` | gRPC :5004 | payment requests and the signed results of the (simulated) Payment Gateway |
| Notification Service | `services/notification/` | gRPC :5005 | the LINE notices of a booking (a log line in progress 1) |
| Staff Account Service | `services/staff-account/` | gRPC :5006 | staff sign-in sessions and staff accounts |
| Customer Web App | `frontend/customer-web-app/` | :5173 | the LINE (LIFF) app: screens C1 to C9 |
| Back-office Web App | `frontend/back-office-web-app/` | :5174 | the staff app: screens B1 to B7 |

Three decisions shape the code (the ADRs of the project document):

- **REST at the gateway only, gRPC inside** (ADR-12). Every service has exactly one API, its `.proto` file; the
  gateway's route table maps each REST route onto one gRPC method, passes the caller's identity as gRPC metadata and
  maps the gRPC status to the HTTP status. The web apps never see gRPC; the services never speak REST.
- **The booking owns the hold; the table map is a read model** (ADR-13). A hold is one insert in the Booking
  Service that only one of several concurrent customers wins; the Table Availability Service keeps the projection
  that the web apps poll every 2 seconds with an ETag, and is updated after each booking transition.
- **A modular monolith mode for development and tests** (ADR-14). The same code runs as one process: each service's
  API layer is called in-process, every message still through the Protocol Buffers serializers, so the end-to-end
  tests run in milliseconds. It is never the deployment target.

The two flows of the Deliverable 3 demo: **Create Zone Map and Create Round** (the manager, REST CRUD through the
gateway onto the Concert Round Service, which creates the round's table map in the Table Availability Service when
the round is published) and **Create Booking** (the customer, `POST /api/bookings`: the Booking Service reads the
round, wins the hold in its own store and reports it to the table map; the party size then computes the fee).

## Contracts

The design is contract first, derived in one direction: the domain model of the document → each service's data model
([docs/data-model.md](docs/data-model.md)) → its types (`src/model.ts`) → its gRPC messages (`proto/*.proto`, types
generated into `proto/gen/`) → the routes of the gateway ([docs/openapi.yaml](docs/openapi.yaml), from which the web
apps generate their client types). [docs/contracts.md](docs/contracts.md) is the readable route table with the gRPC
method, the roles and the notes behind each route. A contract change is a compile error in every caller, the gateway
included.

## Run

```bash
npm install                 # one install for every workspace
npm run dev                 # the seven backend processes from the TypeScript sources (tsx), coloured logs
npm run dev:mono            # the same backend as ONE process on :4000 (ADR-14), for debugging and quick checks
npm run dev:customer        # the Customer Web App on :5173 (proxies /api to :4000)
npm run dev:backoffice      # the Back-office Web App on :5174; sign in with manager/manager
docker compose up --build   # the seven backend processes as containers, compiled with tsc in the image
demo/rest-demo.sh           # the demo flows as readable curl calls through the gateway (needs jq)
demo/grpc-demo.sh           # CRUD on the Table Availability Service with grpcurl
```

## Test

```bash
npm test                    # node:test: unit tests of every service, the in-process end-to-end flows and the use case scenarios
npm run smoke               # the demo flows against the running gateway (npm run dev or dev:mono first): the wire-level check
npm run test:e2e            # Playwright: the use case scenarios through the real screens (starts the servers it needs)
npm run typecheck           # tsc on every package; run before a PR
npm run proto               # regenerate proto/gen/ after a change to a .proto file (commit the result)
node scripts/test-traceability.mjs   # docs/test-traceability.md: every use case scenario and the test that covers it
```

The unit tests stub the collaborators and test `domain.ts` alone. The scenario tests (`monolith/test/scenarios/`)
drive each basic, alternative and exception flow of the use cases through the gateway with the services in-process,
named by the flow they cover (`UC-01 AF-3 Table Just Taken by Another Customer`). The Playwright suite
(`frontend/e2e/`) does the same through the screens. The smoke test is the one check that runs over the network.

## Deploy

The demo deployment is the monolith on a process host and the two web apps on Vercel; the microservices themselves are
deployed with `docker-compose.yml`.

**Backend on Render** (free plan): New → Blueprint → this repository. `render.yaml` creates the web service
`seats-monolith` from `Dockerfile.monolith`, which runs `monolith/src/server.ts` on the port Render gives it, with
`/health` as the health check. Its URL is `https://seats-monolith.onrender.com`; if Render has to change the name, put
the new host into the two `vercel.json` files below. The free plan sleeps after 15 minutes without traffic (the first
request then takes up to a minute) and keeps the data in memory, so it starts empty after every sleep: seed it with
`GATEWAY=https://seats-monolith.onrender.com npm run smoke` or through the back-office.

**Web apps on Vercel** (Hobby plan): import this repository twice, once with the root directory
`frontend/customer-web-app` and once with `frontend/back-office-web-app`. Each folder's `vercel.json` sets the
install and build commands (they run from the repository root, so the shared client builds too), the output
directory and the rewrites: `/api/*` and `/health` go to the Render backend, so the apps stay same-origin and need no
CORS, and every other path serves `index.html` for the client-side routes. No environment variable is needed. After
the first deploy, `https://<app>.vercel.app/health` must answer the backend's health JSON; the customer app's URL is
the one to register as the LIFF endpoint later (ADR-01).

## Inside a service

TypeScript throughout (ES modules, `strict`), the same layout in every service:

| File | Holds |
|---|---|
| `src/model.ts` | the types of the service's data model |
| `src/domain.ts` | the rules: one function per operation of the document's Table 5.3; no transport code |
| `src/store.ts` | the in-memory store behind the domain (to be swapped for Mongoose, ADR-06) |
| `src/api.ts` | the API layer: one function per gRPC method, request message in, response message out |
| `src/grpc.ts` | the gRPC server over the API layer, plus `grpc.health.v1.Health` |
| `src/clients.ts` | the gRPC clients of the services it calls, each call with a deadline |
| `src/adapters.ts` | the ports to the external systems it uses, with their fakes (where the service has one) |
| `test/` | unit tests of the domain with the clients stubbed |

Every service serves the standard health check; the gateway's `GET /health` calls each of them.

## External systems: adapters and their fakes

The LINE Platform, the Payment Gateway and the object storage are reached only through an adapter, a module of the
component that uses it (project document, Table 5.2). Each adapter is a port with a fake behind it in progress 1; the
real implementation replaces the fake by configuration, and the tests inject their own doubles through the same port.

| Port | Where | Fake (default) | Selected by |
|---|---|---|---|
| LINE Login: verify an ID token | `gateway/src/adapters.ts` | accepts `Authorization: Bearer fake-line-<LINE user id>` | `LINE_LOGIN=fake` |
| LINE Messaging: push a message | `services/notification/src/adapters.ts` | logs the push and records it; a test can make the next pushes fail, which the retry job of FR-22 then retries three times | `LINE_MESSAGING=fake` |
| Payment Gateway: open a checkout, verify a result's signature | `services/payment/src/adapters.ts` | the simulated gateway of ADR-11: a fake checkout URL, the signature `sim-<payment id>` | `PAYMENT_GATEWAY=simulated` |
| Media Storage: store the image of a zone map | `services/concert-round/src/adapters.ts` | answers a URL without storing; a test can make the next store fail (UC-04 EF-3) | `MEDIA_STORAGE=fake` |

The gateway therefore accepts two identities: the progress-1 headers `x-user-id` and `x-role` (staff, and the web
apps for now) or a LINE ID token as `Authorization: Bearer …`, verified by the LINE Login Adapter, which makes the
caller a customer.

## Progress 1 stubs

- **Auth**: the web apps still send the headers `x-user-id` and `x-role` (`customer`, `manager`, `front_staff`,
  `owner`); the LIFF app will send the LINE ID token instead. Staff can already sign in at the Staff Account Service
  (`POST /api/sessions`), which seeds `manager/manager`, `door1/door1` and `owner/owner`; the staff routes do not check
  the session token yet.
- **Storage**: every service keeps its data in memory behind `src/store.ts`.
- **Payment**: the Booking Service's `startPayment()` still answers 501; wiring it to the Payment Service comes in
  progress 2. The simulated gateway's result is posted to `POST /api/payments/webhook`.
- **Notifications**: the Booking Service does not call the Notification Service yet.
- **Not built yet**: check-in (501).
