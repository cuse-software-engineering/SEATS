# SEATS — Seating & Event Availability Tracking System

Implementation of the microservice design in the project document of group SE 101 (2110521 Software Architecture,
`2110521_Software_Architecture/assignments/group/workspace/report/project-document/`). Deliverable 3 (progress 1)
builds the MVP services of the two demo flows, **Create Zone Map + Create Round** and **Create Booking**.

| Part | Folder | Owner | API |
|---|---|---|---|
| API Gateway | `gateway/` | Will | REST :4000 (the only entry for the web apps; fake auth by headers) |
| Concert Round Service | `services/concert-round/` | Natchy | REST :4001 (zone maps, table types, rounds, parameters) + gRPC :5001 |
| Table Availability Service | `services/table-availability/` | Will | gRPC :5003 (CRUD on round table status) + REST :4003 (polled read) |
| Booking Service | `services/booking/` | Peat SE | REST :4002 (customer flow) + gRPC client of the two above |
| Demo scripts, smoke test | `demo/` | Peat CS | curl / grpcurl / node |
| Contracts | `proto/`, `docs/contracts.md` | everyone, reviewed by Will | |

The design is contract-first: the `.proto` files and the route tables in [docs/contracts.md](docs/contracts.md) are
agreed before code, and the operation names are those of Table 5.3 of the project document, one function per
operation (ADR-12: REST through the gateway, gRPC between services).

## Run

```bash
npm install                 # one install for all workspaces
npm run dev                 # all four processes with coloured logs (Ctrl-C stops all)
npm run smoke               # the two flows end to end against the gateway (services must be running)
demo/rest-demo.sh           # the same flow as readable curl calls (needs jq)
demo/grpc-demo.sh           # CRUD on the Table Availability Service with grpcurl
docker compose up --build   # the same four processes as containers
```

Every service also answers `GET /health`. The web apps are not part of progress 1: the demo uses curl and grpcurl.

## Progress 1 stubs (say so in the video)

- **Auth**: the gateway trusts the headers `x-user-id` and `x-role` (`customer`, `manager`, `front_staff`, `owner`).
  LINE Login (ADR-01) and staff sessions (ADR-07, Staff Account Service) come later.
- **Storage**: each service keeps its data in memory behind `src/store.js`; swap it for Mongoose models (ADR-06)
  without touching `domain.js`.
- **Not built yet**: Payment Service (startPayment answers 501), Notification Service (the log line says what would
  be sent), Staff Account Service, check-in, media upload (the adapter returns a URL).

## Git

One PR per service into `main`, reviewed by Will. Commit under your own name: contribution is graded per person.
