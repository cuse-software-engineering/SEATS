# Staff Account Service

The back-office identities: staff accounts with a role of Table 5.2 (`manager`, `front_staff`, `owner`) and the
sessions of the staff who signed in (Staff Account DB, ADR-07). Its only API is gRPC :5006
(`proto/staff_account.proto`): the gateway maps `POST /api/sessions`, `DELETE /api/sessions/current` and the
`/api/staff-accounts` routes onto it (`docs/contracts.md`).

Progress 1 seeds three accounts at start, each with the password equal to the username: `manager` (manager), `door1`
(front_staff) and `owner` (owner). Passwords are stored as salted scrypt hashes; sessions live in memory, so a restart
signs everyone out. A wrong password or a Disabled account answers UNAUTHENTICATED (401 at the gateway). The gateway
still trusts the `x-user-id` / `x-role` headers: checking the bearer token on every staff route comes in progress 2.

- `src/domain/` — the pure core: `accounts.ts` holds `signIn()`, `signOut()`, `createStaffAccount()`, `listStaffAccounts()`, `updateStaffAccount()`, `disableStaffAccount()` and `seedStaffAccounts()`; `model.ts` the data model; `repository.ts` the repository interfaces and `ports.ts` the ports the rules reach them through; `index.ts` is the barrel.
- `src/infrastructure/` — `store.ts`, the Staff Account DB (in memory, or MongoDB by configuration, ADR-06); `repositories.ts`, `accounts` and `sessions` over it (one per aggregate); `index.ts` with `wire()`, which binds them to the domain's ports.
- `src/api/` — `handlers.ts`, one function per method of `staff_account.proto`; `grpc.ts`, the gRPC server around it plus the health check.
- `src/server.ts` — connects the store, wires the ports, seeds the accounts and starts gRPC.
