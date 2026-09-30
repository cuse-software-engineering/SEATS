# API Gateway (owner: Will)

REST :4000. The only component the Frontend calls and the only REST API of the system (Figure 5.1, ADR-12). It
authenticates the caller, checks the role of the route (FR-66) and makes one gRPC call to the service that owns the
operation: path, query and JSON body in, the response message as JSON out, the gRPC status mapped to an HTTP status
(`docs/contracts.md`). It holds no business logic.

Progress 1 auth is fake: send `x-user-id` (a LINE user id for a customer, a staff account for the back-office) and
`x-role` (`customer`, `manager`, `front_staff`, `owner`); the gateway passes both to the service as gRPC metadata.
Two routes need no headers (`auth: 'none'`): `POST /api/sessions` (staff sign-in at the Staff Account Service, 401 on
a wrong password) and `POST /api/payments/webhook` (the simulated Payment Gateway's callback, checked by its
signature). `DELETE /api/sessions/current` takes the token from `Authorization: Bearer <token>`, else from
`x-user-id`. LINE ID tokens (ADR-01) and checking the staff token on every route (ADR-07) come later.

- `src/routes.ts` — the route table: one line per route, type-checked against the generated request messages.
- `src/clients.ts` — the gRPC clients of the six services and their health checks (`GET /health` lists all six).
- `src/server.ts` — Express, auth, the call, the status mapping, `GET /health`.
