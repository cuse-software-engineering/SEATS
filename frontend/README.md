# SEATS web apps (frontend)

The two web apps of the project document: the **Customer Web App** (the LIFF app inside LINE) and the **Back-office
Web App** (the manager's, the owner's and the front staff's screens). Every call goes to the API Gateway, the only
REST API (ADR-12), described in [`docs/openapi.yaml`](../docs/openapi.yaml).

| Package | Folder | Port |
|---|---|---|
| `@seats/frontend-shared` | `frontend/shared/` | — the API types generated from the OpenAPI file, the typed fetch client with the polled read, the session store, server state through TanStack Query, the component kit and its stylesheet, the table map, the logo |
| `@seats/customer-web-app` | `frontend/customer-web-app/` | 5173 |
| `@seats/back-office-web-app` | `frontend/back-office-web-app/` | 5174 |

Vite 6 + React 18 + TypeScript (strict) + react-router-dom 6, [TanStack Query](https://tanstack.com/query) for the
server state and [Zustand](https://zustand.docs.pmnd.rs) for the session, the toasts and the dialog. No UI library:
the kit in `frontend/shared/src/kit.tsx` with one stylesheet, `kit.css`, and a shell stylesheet per app. The ports and
the proxy of `/api` and `/health` to the gateway come from `packages/config` (`vite.config.ts`).

## Run

```bash
npm install                 # once, at the repo root (npm workspaces)
npm run dev:mono            # terminal 1: the backend as one process on :4000 (or npm run dev for the seven processes)
npm run dev:customer        # terminal 2: http://localhost:5173
npm run dev:backoffice      # terminal 3: http://localhost:5174
npm run demo:seed           # optional: table types, a zone map, three published rounds and a few held tables
```

Other scripts, at the root: `npm run typecheck` (every package, the apps included), `npm run build:frontend` (the
three packages; the bundles land in `frontend/*/dist/`), `npm run api-types -w frontend/shared` (regenerate
`frontend/shared/src/api-types.d.ts` after a change to `docs/openapi.yaml`; the generated file is committed).

## How the apps are built

**Features, not screens.** Each app is organised by feature (`src/features/<feature>/`), with components named after
what they do (`RoundList`, `HoldSummaryScreen`, `PriceMatrix`, `StaffAccountsPanel`, …) and `src/app/` for the shell,
the router, the providers and the query keys. The document's screen inventory (C1–C9, B1–B7) is a documentation
concept: the table below maps it to the routes and the features, and no screen id or requirement id appears in the
code names or in anything the user sees.

**Server state** goes through the shared helpers of `frontend/shared/src/query.tsx`: `useGet(key, path)` reads,
`useMutate(fn, { success, failure, invalidate, quiet })` changes, toasts the outcome and refreshes the keys it
touched; `usePolled(path)` keeps the 2-second ETag polling of the table map (ADR-09); `useCountdown` ticks the hold.
The session (`session.ts`) is a Zustand store in localStorage.

**Every click answers.** A success is a toast (`toast.tsx`: role status, `data-testid="toast"`), a failure a toast
in plain words (`describeError`), anything destructive asks first in the confirm dialog (`dialog.tsx`: role dialog),
an invalid field shows its error under the field (`Field`, `Checkbox`), and every read has its loading, empty and
error states (`Loading`, `EmptyState`, `LoadError`). The end-to-end tests assert these after each step.

**Look.** Both apps keep the layouts of the wireframes of Appendix D: the customer app is a phone-width column with
the 48px app bar (back chevron, the SEATS wordmark, the title, the hold countdown, a ⋮ menu with Concert rounds, My
bookings and Log out, which stand in for LINE's rich menu); the back-office has the dark top bar, the sidebar (a
drawer behind ☰ under 700px, where the front staff use the check-in screens) and the three-column editors. The table
map is the shared `TableGrid` of `ui.tsx`: a shape per table (circle, square, sofa, seat, from the table type)
labelled with the zone letter and the number (`A12`), filled by status as the wireframes draw it with a tint on top
(available green, held amber hatch, booked slate, occupied dark); every shape has the accessible name
`table N, <status>`. One accent colour marks the primary actions, the links and the current sidebar item.

## Routes, features and the screens of Appendix D

| Document screen | Route | Feature folder | Routes called |
|---|---|---|---|
| C1 Rich Menu and LINE Login | `/login` | `customer-web-app/src/features/login` | none (the demo login stands in for LINE Login) |
| C2 Concert rounds | `/` | `features/rounds` (`RoundListScreen`, `RoundCard`) | `GET /api/rounds` |
| C3 Table map | `/rounds/:id` | `features/rounds` (`TableMapScreen`, `PriceLines`) | `GET /api/rounds/{id}` (with its tables), `GET /api/rounds/{id}/table-status` polled, `POST /api/bookings` on a tap |
| C4 Hold and booking summary | `/bookings/:id` | `features/booking` | `GET /api/bookings/{id}`, `PUT /api/bookings/{id}/party-size`, `POST /api/bookings/{id}/cancel` |
| C5 Customer profile and consent | `/bookings/:id/profile` | `features/profile` | `GET`/`POST`/`PUT /api/customers/me`, cancel on Decline |
| C6 Booking terms | `/bookings/:id/terms` | `features/terms` | `GET /api/bookings/{id}/terms`, `POST /api/bookings/{id}/terms-acceptance`, cancel on Decline |
| C7 Payment | `/bookings/:id/payment` | `features/payment` | `POST /api/bookings/{id}/payment` (not available yet), `GET /api/payments/{id}` polled once it exists, cancel |
| C8 Confirmation and e-ticket | `/bookings/:id/confirmation` | `features/confirmation` | `GET /api/bookings/{id}`, `GET /api/bookings/{id}/e-ticket` (not available yet) |
| C9 My Bookings | `/my-bookings` | `features/my-bookings` | `GET /api/customers/me/bookings` |
| B1 Sign-in | `/sign-in` | `back-office-web-app/src/features/sign-in` | `POST /api/sessions`; `DELETE /api/sessions/current` from the sidebar |
| B2 Zone map editor | `/zone-maps?map=` | `features/zone-maps` | `GET`/`POST /api/zone-maps`, `GET`/`PUT`/`DELETE /api/zone-maps/{id}`, `/image`, `/validate`, `/activate`; `GET /api/table-types`, `PUT /api/table-types/{id}` |
| B3 Round editor | `/rounds?round=` | `features/rounds` | `GET /api/rounds/all`, `POST /api/rounds`, `GET`/`PUT`/`DELETE /api/rounds/{id}`, `/validate`, `/publish`, `GET /api/zone-maps?status=Active`, `GET /api/zone-maps/{id}` |
| B4 Live view | `/live?round=` | `features/live-view` | `GET /api/rounds`, `GET /api/rounds/{id}`, `GET /api/rounds/{id}/table-status` polled, `GET /api/rounds/{id}/bookings` |
| B5 Check-in scanner | `/check-in` | `features/check-in` | `POST /api/check-ins/verify` (not available yet) |
| B6 Verification result and entry confirmed | `/check-in/result` | `features/check-in` | `POST /api/check-ins` (not available yet) |
| B7 Business parameters and staff accounts | `/settings` | `features/settings` | `GET`/`PUT /api/business-parameters`; `GET`/`POST /api/staff-accounts`, `PUT`/`DELETE /api/staff-accounts/{id}` |

The sidebar shows what the role may open (front staff: Live view and Check-in; the owner reads the editors without
changing them). Every back-office route but `/sign-in` redirects to `/sign-in` without a session; the customer app
sends a visitor to `/login` and back to where they were.

## Authentication today

The gateway trusts two headers, `x-user-id` and `x-role` (`customer`, `manager`, `front_staff`, `owner`), which the
client (`frontend/shared/src/api.ts`) adds from the session.

- Customer app: the login dialog takes a LINE user id (any id works; it stands in for LINE Login, ADR-01) and stores
  it with the role `customer`.
- Back-office: sign-in posts username and password to `POST /api/sessions`; the answer (`staffAccountId`, `role`,
  `token`) becomes the session: `x-user-id` = the staff account id, `x-role` = the role, and the token is also sent as
  `Authorization: Bearer` (what ADR-07 will check). The Staff Account Service seeds `manager`/`manager`,
  `door1`/`door1` (front staff) and `owner`/`owner`.

## Not available yet

The screens are complete; four operations behind them answer 501 until their external system is connected, and the
screens say so in plain words: **payment** (`POST /api/bookings/{id}/payment`; the confirmation can be previewed),
the **e-ticket**, **check-in** (`POST /api/check-ins/verify`, `POST /api/check-ins`; the camera viewfinder is a
placeholder and the reference is typed), and the **zone map image** (a file name is sent; the media upload is a stub).

## End-to-end tests

`frontend/e2e/` (`@seats/e2e`) drives both web apps in Chromium with [Playwright](https://playwright.dev). The data
is seeded through the gateway as the manager and as customers (fake-auth headers), each run with its own names and
free future dates, so runs never overlap.

```bash
npm install                 # once; then, once per machine: npx playwright install chromium
npm run test:e2e            # from the repo root, both apps
cd frontend/e2e && npx playwright test --project=customer   # one app; --ui to watch
```

`frontend/e2e/playwright.config.ts` starts what is not already running: `npm run dev:mono` (the backend as one
process on :4000), `npm run dev:customer` (:5173) and `npm run dev:backoffice` (:5174), all from the repo root, and
stops what it started. Two projects: `customer` (`uc-01`, `uc-09`, `customer-*`) and `backoffice` (`uc-03`, `uc-04`,
`uc-08`, `backoffice-*`). Traces and screenshots are kept for failed tests only (`frontend/e2e/test-results/`).

Two kinds of test file:

- **Use case flows**, `tests/uc-NN.spec.ts`: one test per flow of the use case descriptions of the project document,
  named exactly `<UC id> <flow id> <flow title>` (`UC-01 AF-3 Table Just Taken by Another Customer`); the backend
  traceability script matches on that prefix, so these names never change.
- **Feature suites**, `tests/customer-*.spec.ts` and `tests/backoffice-*.spec.ts`: the rounds list and its badges,
  the ⋮ menu and log-out, holding and cancelling with the dialog, the details form and its errors, My bookings;
  creating several rounds in a row and the overlap refusal, discarding drafts, the zone map editor, staff accounts
  (a disabled account refused at sign-in), business parameters taking effect on a new hold, and the live view
  following a hold made through the API. Every step asserts the toast, the dialog, the field error or the badge it
  produced.

Shared steps live in `helpers/`: `seed.ts` (the manager's fixtures), `seed-customers.ts` (holds and profiles as
customers), `customer.ts`, `backoffice.ts` (page helpers: `expectToast`, `confirmDialog`, `validation`, …),
`fixtures.ts` (a worker-scoped seed), `ui.ts` (login, sign-in, `tableButton`). The screens carry a few `data-testid`
attributes (`round`, `booking`, `countdown`, `fee-total`, `price-lines`, `toast`, `validation`, `table-properties`,
`zone-summary`, …) where a heading or a button name is not a stable selector.

**Against the deployment.** `npm run test:e2e:deployed` (repo root) runs the same suite on the Vercel apps with the
Render backend: it empties the demo through the monolith's reset route first (`DEMO_RESET_TOKEN`, see "Deploy" in the
root README), runs the tests, and empties and seeds the demo again at the end. The config starts nothing for a URL it
is given: `GATEWAY`, `CUSTOMER_APP_URL` and `BACK_OFFICE_APP_URL` name the running system. A dev server the config
starts proxies `/api` to that same gateway.
