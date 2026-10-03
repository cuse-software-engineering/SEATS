# Test design

How SEATS is tested, by technique and by level. The use case scenarios ([test-traceability.md](test-traceability.md))
cover the flows of the document's use cases; the techniques below cover the input domains, the states and the rules of
each operation, and the properties the architecture promises. Everything runs on Node's built-in test runner
(`node --test`) through tsx, with Playwright for the two web apps.

## Levels

| Level | Where | Runs with | What is real, what is a double |
|---|---|---|---|
| Unit, per service | `services/*/test/*.test.ts`, one file per domain file | `npm test` | the rules and the in-memory repositories are real; the collaborator services are stubs or spies on the client objects; the external systems are the fakes of `infrastructure/adapters.ts` |
| Contract of the shared packages | `packages/*/test` | `npm test` (`TEST_MONGO_URL` adds MongoDB) | the repository contract against memory and MongoDB; the error mapping |
| Scenario, in-process | `monolith/test/scenarios/uc-NN.test.ts` | `npm test` | the six services and the gateway in one process, calls through the Protocol Buffers serializers, in-memory databases, the fakes for external systems |
| Scenario, over the network | the same files | `npm run test:api` with `GATEWAY` | a running system: microservice mode, docker compose, the monolith on MongoDB, or a deployment |
| End to end | `frontend/e2e` | `npm run test:e2e` | the real screens against the in-process monolith |
| End to end, deployed | the same files | `npm run test:e2e:deployed` with `DEMO_RESET_TOKEN` | the Vercel apps and the Render backend, emptied through the monolith's reset route before the run and seeded again after it |
| Smoke | `demo/smoke.mjs` | `npm run smoke` | the demo flows against any gateway |

## Techniques

**Equivalence class testing with boundary values.** Every operation of a domain file has a table in the header comment of
its `describe`: one row per class of input the rules distinguish, with the boundary values made explicit (party size 0,
1, the capacity, the capacity plus one; a hold that ends after now, exactly now, before now; a phone number of 9, 10 and
11 digits; two rounds whose windows touch end to start). Each row is one named test, written table-driven so a row is one
line and the test name is the row.

**State-transition testing.** The state machines of the model are tested as matrices of state × event, one test per
reachable cell: a booking (Held, Cancelled, Expired) against every operation; a table (Available, Held, Booked, Occupied)
against hold, release, book and occupy, with the booking-id rule; a zone map (Draft, Active) and a round (Draft,
Published) against edit, validate, activate or publish, discard; a staff account (Active, Disabled) against sign-in and
the account operations. Valid cells change the state, invalid cells answer a conflict and change nothing.

**Decision tables.** Where an outcome depends on several conditions at once, the conditions are laid out as a table and
every rule gets a row: holding a table (round Published, booking open, table for sale, table free, table exists);
publishing a round (zone map Active, times valid, prices complete, no overlap); receiving a payment result (signature,
payment known, status, already final).

**Concurrency.** `monolith/test/scenarios/concurrency.test.ts` fires twenty holds on one table at the same moment through
the gateway and expects exactly one success (BRULE-03, NFR-20). In-process the lock is the in-memory insert; over the
network on MongoDB it is the unique index, so `MONGO_URL=… npm run test:api` proves the property on the real store.
The repository contract test does the same for the store alone.

**Authorization matrix.** `monolith/test/scenarios/authorization.test.ts` calls every route of the gateway's route table
as anonymous, customer, front staff, manager and owner and checks each cell against the roles the route declares (FR-66):
no identity is 401, a role the route excludes is 403, an allowed role is never refused by the gateway. A second test pins
which routes are open (sign-in and the payment webhook only).

**Fault injection.** The fakes carry a `failNext` knob, so a scenario can make the object storage refuse an image
(UC-04 EF-3: 502, the zone map unchanged) or the LINE push fail and watch the retry job of FR-22 stop after three
attempts. The error package's own tests pin how a defect, an infrastructure failure and a domain refusal each reach the
client.

**Test doubles.** Collaborator services are replaced at the port: a stub answers a canned message, a spy records the
request (the hold reported to the read model). External systems are the same fakes the running system uses in progress 1.
The database is never mocked: the in-memory repository is a fake with the full contract, which is what catches a
forgotten save or a shared-reference bug.

## Coverage

`npm run test:coverage` runs the unit, contract and in-process scenario tests under Node's coverage and fails below 90 %
of lines, 85 % of branches and 80 % of functions over the backend sources. The gRPC clients and the progress-2 stubs
are the expected gaps: the clients are stubbed in unit tests and exercised by the network suite, the stubs answer 501.

## What the techniques found

Writing the tables against the rules of the document, not against the code, turned up eight gaps on the first pass, all
fixed in the same commit and each now a passing row:

| Service | Gap | Technique that found it |
|---|---|---|
| Staff Account | the duplicate-username check used the untrimmed name, so `  door1  ` created a second `door1` | equivalence class "surrounding spaces, duplicate" |
| Booking | `startPayment` checked the fee and the terms but not the state: a Cancelled or Expired booking answered "not implemented" instead of a conflict | state × operation matrix |
| Booking | a profile update kept the padding of the name while creation trimmed it | equivalence class "padded name" |
| Notification | a notice without the round name and table number was pushed as "Your table undefined for undefined" | required-field classes |
| Concert Round | a malformed start time made `updateRound` throw a RangeError, a defect instead of an EF-1 refusal | boundary "start malformed" |
| Concert Round | a malformed date (`2099-13-45`) and a negative package price passed validation | equivalence classes of the schedule and the prices |
| Concert Round | business parameters accepted non-integers although the data model declares them as whole numbers | equivalence class per field |
| Concert Round | editing an Active zone map treated every table as unbooked when the Table Availability Service did not answer, so UC-04 AF-1 could not be checked | state matrix, collaborator-down cell |

Every row of every table runs on each `npm test`; a rule that changes shows up as the named row that stops passing.

