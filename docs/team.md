# Team, ownership and contribution

Group SE 101, 2110521 Software Architecture (Semester 1, 2026). The system is the project document's SEATS; this file
says who builds what in this repository and how we work. The system itself is described in the [README](../README.md).

## Members

| Member | Nickname | Owns |
|---|---|---|
| Watayut A. | Will | API Gateway, Table Availability Service, monolith mode, contracts review, integration, the project document, the video |
| Peat SE | Peat SE | Booking Service |
| Natchy | Natchy | Concert Round Service |
| Peat CS | Peat CS | Demo scripts and smoke test, the two web apps (`frontend/`), the end-to-end tests |

## Ownership by folder

| Folder | Owner | Notes |
|---|---|---|
| `gateway/` | Will | the only REST API; route table, auth, status mapping |
| `services/concert-round/` | Natchy | zone maps, table types, rounds, prices, business parameters |
| `services/table-availability/` | Will | the read model of the table map (ADR-13) |
| `services/booking/` | Peat SE | the booking and the hold, customer profile, terms |
| `services/payment/`, `services/notification/`, `services/staff-account/` | unassigned (skeletons) | to be taken in progress 2 |
| `monolith/` | Will | the composition root of the one-process mode (ADR-14) |
| `frontend/` | Peat CS | customer web app, back-office web app, shared client, Playwright tests |
| `demo/` | Peat CS | curl and grpcurl scripts, smoke test |
| `proto/`, `docs/contracts.md`, `docs/openapi.yaml` | everyone, reviewed by Will | a contract change is agreed before code |

## How we work

- **Contract first.** A change to a `.proto` file or to `docs/openapi.yaml` is proposed in a PR of its own and
  reviewed by Will before the code that needs it; `npm run proto` regenerates the types and the result is committed.
- **One PR per service into `main`**, reviewed by Will. Keep `npm run typecheck`, `npm test` and `npm run smoke`
  green before asking for review.
- **Commit under your own name.** Contribution is graded per person; do not commit from a shared account.
- **Names come from the project document.** Operations are the functions of Table 5.3, routes those of Table 6.11,
  screens those of Appendix D; when the document changes, the code follows in the same PR or the next.
- **Deliverable 3 (progress 1, due 3 Oct 2026).** The video shows REST CRUD on zone maps and rounds through the
  gateway, the Create Booking flow with the gRPC hops in the logs, and gRPC CRUD on the Table Availability Service
  with grpcurl. The group's task plan and timeline are kept with the project document.
