# Staff Account Service

The back-office identities: staff accounts with a role of Table 5.2 (`manager`, `front_staff`, `owner`) and the
sessions of the staff who signed in (Staff Account DB, ADR-07). Its only API is gRPC :5006
(`proto/staff_account.proto`): the gateway maps `POST /api/sessions`, `DELETE /api/sessions/current` and the
`/api/staff-accounts` routes onto it (`docs/contracts.md`).

Progress 1 seeds three accounts at start, each with the password equal to the username: `manager` (manager), `door1`
(front_staff) and `owner` (owner). Passwords are stored as salted scrypt hashes; sessions live in memory, so a restart
signs everyone out. A wrong password or a Disabled account answers UNAUTHENTICATED (401 at the gateway). The gateway
still trusts the `x-user-id` / `x-role` headers: checking the bearer token on every staff route comes in progress 2.

- `src/domain.ts` — `signIn()`, `signOut()`, `createStaffAccount()`, `listStaffAccounts()`, `updateStaffAccount()`, `disableStaffAccount()`, plus `seedStaffAccounts()`.
- `src/store.ts` — in-memory store (swap for Mongoose, ADR-06).
- `src/model.ts`, `src/grpc.ts`, `src/server.ts` — transport only.
