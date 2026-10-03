# SEATS web apps (frontend)

The two web apps of Appendix D of the project document, as a working skeleton against the API Gateway: the
**Customer Web App** (the LIFF app inside LINE, screens C1–C9) and the **Back-office Web App** (screens B1–B7). Every
call goes to the gateway on `:4000`, the only REST API (ADR-12), described in [`docs/openapi.yaml`](../docs/openapi.yaml).

| Package | Folder | Port |
|---|---|---|
| `@seats/frontend-shared` | `frontend/shared/` | — (API types generated from the OpenAPI file, the typed fetch client with the polled read, the session, small React helpers) |
| `@seats/customer-web-app` | `frontend/customer-web-app/` | 5173 |
| `@seats/back-office-web-app` | `frontend/back-office-web-app/` | 5174 |

Vite 6 + React 18 + TypeScript (strict) + react-router-dom 6; no UI library, no CSS framework: one plain grayscale
stylesheet per app. The ports and the proxy of `/api` and `/health` to `http://localhost:4000` are in each app's
`vite.config.ts`.

## Run

```bash
npm install                 # once, at the repo root (npm workspaces)
npm run dev                 # terminal 1: the backend (gateway + services)
npm run dev:customer        # terminal 2: http://localhost:5173
npm run dev:backoffice      # terminal 3: http://localhost:5174
npm run smoke               # optional: publishes a round and makes a booking, so C2 has something to show
```

Other scripts, at the root: `npm run typecheck` (every package, the apps included), `npm run build:frontend` (the
three packages; the bundles land in `frontend/*/dist/`), `npm run api-types -w frontend/shared` (regenerate
`frontend/shared/src/api-types.d.ts` after a change to `docs/openapi.yaml`; the generated file is committed).

## End-to-end tests

`frontend/e2e/` (`@seats/e2e`) drives both web apps in Chromium with [Playwright](https://playwright.dev), one test
per flow of the use-case descriptions of the project document (Section 2.2), on the real screens; the gateway API is
used only to seed data as the manager (fake-auth headers, as `demo/smoke.mjs` does), on a free random future date so
that runs never overlap.

```bash
npm install                 # once; then, once per machine: npx playwright install chromium
npm run test:e2e            # from the repo root; add -- --ui to watch, -- --project=customer for one app
```

`frontend/e2e/playwright.config.ts` starts what is not already running: `npm run dev:mono` (the backend as one
process on :4000), `npm run dev:customer` (:5173) and `npm run dev:backoffice` (:5174), all from the repo root, and
stops what it started. Two projects: `customer` (`uc-01`, `uc-09`) and `backoffice` (`uc-03`, `uc-04`, `uc-08`).
Traces and screenshots are kept for failed tests only (`frontend/e2e/test-results/`, git-ignored).

**Against the deployment.** `npm run test:e2e:deployed` (repo root) runs the same suite on the Vercel apps with the
Render backend: it empties the demo through the monolith's reset route first (`DEMO_RESET_TOKEN`, see "Deploy" in the
root README), runs the tests, and empties and seeds the demo again at the end. The config starts nothing for a URL it
is given: `GATEWAY`, `CUSTOMER_APP_URL` and `BACK_OFFICE_APP_URL` name the running system, all three set by the
script, or any other deployment, or the local servers to try the mechanism. The seed helper reaches the gateway
directly; the screens reach it through the app's `/api` rewrite, as a user's browser does. A dev server the config
starts proxies `/api` to that same gateway.

**Naming rule**: one file per use case (`tests/uc-NN.spec.ts`) and every test is named exactly
`<UC id> <flow id> <flow title>` as the document names the flow, for example `UC-01 AF-3 Table Just Taken by Another
Customer` or `UC-03 basic flow Create Concert Round`; the backend traceability script matches on that prefix. The
screens carry a few `data-testid` attributes (`round`, `booking`, `countdown`, `fee-total`, `price-lines`, `toast`,
`validation`, `table-properties`, `zone-summary`, …) where a heading or a button name is not a stable selector; every
table shape has the accessible name `table N, <status>`.

## Look and layout

Both apps follow the wireframes of Appendix D screen for screen: the customer app is the LIFF page, a phone-width
column with the 48px app bar (back chevron, title, the hold countdown at the right, and a ⋮ menu with Concert rounds,
My bookings and Log out, which stand in for LINE's rich menu); the back-office has the dark top bar, the left sidebar
(a drawer behind ☰ on a phone, where the front staff use B5 and B6) and the three-column editors. The table map is
the shared `TableGrid` of `frontend/shared/src/ui.tsx`: a shape per table (circle, square, sofa, seat, from the
table type), labelled with the zone letter and the number (`A12`), filled by status as the wireframes draw it, with a
tint on top (available green, held amber hatch, booked slate, occupied dark). One accent colour marks the primary
actions, the links and the current sidebar item. The wireframe sources (`tools/draw_screens.py` of the group folder)
carry the same ⋮ and ☰, so the figures and the screens agree.

## Fake authentication (progress 1)

The gateway trusts two headers, `x-user-id` and `x-role` (`customer`, `manager`, `front_staff`, `owner`), and the
client (`frontend/shared/src/api.ts`) adds them from the session (`frontend/shared/src/session.ts`, localStorage).

- Customer app: **C1** stands in for LINE Login (ADR-01). Type any LINE user id once (for example `U-somchai`);
  it is sent as `x-user-id` with the role `customer`. "change" in the header opens C1 again.
- Back-office: **B1** posts username and password to `POST /api/sessions`; the answer (`staffAccountId`, `role`,
  `token`) becomes the session: `x-user-id` = the staff account id, `x-role` = the role, and the token is also sent
  as `Authorization: Bearer` (what ADR-07 will check). The Staff Account Service seeds `manager`/`manager`,
  `door1`/`door1` (front staff) and `owner`/`owner`. When the service is not there (`POST /api/sessions` answers
  404, 501 or 502) B1 shows a **dev sign-in** that sets the session locally with a chosen role; the "dev sign-in"
  link shows it at any time.

## Screens and routes (Appendix D, in short)

| Screen | Route | Routes called |
|---|---|---|
| C1 Rich Menu and LINE Login | `/login` | none (LINE Login stub) |
| C2 Concert rounds | `/` | `GET /api/rounds` |
| C3 Table map | `/rounds/:id` | `GET /api/rounds/{id}`, `GET /api/rounds/{id}/tables`, `GET /api/rounds/{id}/table-status` polled every 2 s (ETag / If-None-Match), `POST /api/bookings` on a tap |
| C4 Hold and booking summary | `/bookings/:id` | `GET /api/bookings/{id}`, `PUT /api/bookings/{id}/party-size`, `POST /api/bookings/{id}/cancel` (+ `GET /api/rounds/{id}` for the round's name) |
| C5 Customer profile and consent | `/bookings/:id/profile` | `GET`/`POST`/`PUT /api/customers/me`, cancel on Decline |
| C6 Booking terms | `/bookings/:id/terms` | `GET /api/bookings/{id}/terms`, `POST /api/bookings/{id}/terms-acceptance`, cancel on Decline |
| C7 Payment | `/bookings/:id/payment` | `POST /api/bookings/{id}/payment` (501 today), `GET /api/payments/{id}` polled once it exists, cancel |
| C8 Confirmation and e-ticket | `/bookings/:id/confirmation` | `GET /api/bookings/{id}`, `GET /api/bookings/{id}/e-ticket` (501 today), `GET /api/rounds/{id}` for the check-in window |
| C9 My Bookings | `/my-bookings` | `GET /api/customers/me/bookings` |
| B1 Sign-in | `/sign-in` | `POST /api/sessions`; `DELETE /api/sessions/current` from the header |
| B2 Zone map editor | `/zone-maps` | `GET`/`POST /api/zone-maps`, `GET`/`PUT`/`DELETE /api/zone-maps/{id}`, `/image`, `/validate`, `/activate`; `GET /api/table-types`, `PUT /api/table-types/{id}` |
| B3 Round editor | `/rounds` | `GET`/`POST /api/rounds`, `GET`/`PUT`/`DELETE /api/rounds/{id}`, `/validate`, `/publish`, `GET /api/rounds/{id}/tables` (preview), `GET /api/zone-maps?status=Active`, `GET /api/zone-maps/{id}` |
| B4 Live view | `/live` | `GET /api/rounds`, `GET /api/rounds/{id}/tables`, `GET /api/rounds/{id}/table-status` polled, `GET /api/rounds/{id}/bookings` |
| B5 Check-in scanner | `/check-in` | `POST /api/check-ins/verify` (501 today) |
| B6 Verification result and entry confirmed | `/check-in/result` | `POST /api/check-ins` (501 today) |
| B7 Business parameters and staff accounts | `/settings` | `GET`/`PUT /api/business-parameters`; `GET`/`POST /api/staff-accounts`, `PUT`/`DELETE /api/staff-accounts/{id}` |

Every route of the back-office but `/sign-in` redirects to `/sign-in` without a session. Every failed call shows the
gateway's `{error, details}` in an alert box on the screen.

`GET /api/rounds` answers the customer's upcoming Published rounds only; the back-office also needs the Draft rounds
(open point KI-17, Appendix D.3). Until a list operation exists, B3 and B4 also take a round id typed by hand, and B3
keeps the round it has just created open.

## Stubbed in progress 1

- **LINE Login**: C1 takes a LINE user id by hand (see above); the LIFF SDK and the ID token come with ADR-01.
- **Payment**: `POST /api/bookings/{id}/payment` answers 501; C7 shows "Payment comes in progress 2" and offers
  Cancel. C8 can be opened from C7 as a preview: the e-ticket route answers 501 too.
- **Check-in**: `POST /api/check-ins/verify` and `POST /api/check-ins` answer 501; B5 and B6 show the message. The
  camera viewfinder of B5 is a placeholder; the reference is typed.
- **Zone map image**: B2 sends a file name to `POST /api/zone-maps/{id}/image` (the media upload is an adapter stub);
  zones and tables are edited in table rows, not drawn on the image.
- **Staff sessions**: the session token is stored and sent as Bearer, but the gateway still reads the fake headers.
