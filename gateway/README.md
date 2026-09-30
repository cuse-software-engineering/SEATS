# API Gateway (owner: Will)

REST :4000. The only component the Frontend calls (Figure 5.1). It authenticates the caller, checks the role of the
route (FR-66) and forwards the request to the service that owns the operation, stripping `/api`.

Progress 1 auth is fake: send `x-user-id` (a LINE user id for a customer, a staff account for the back-office) and
`x-role` (`customer`, `manager`, `front_staff`, `owner`). LINE ID tokens (ADR-01) and staff sessions (ADR-07) come later.
The route table is `src/routes.ts`.
