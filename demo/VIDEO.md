# The Deliverable 3 video: runbook

The brief: a clip under five minutes showing one or more REST services with CRUD and one or more gRPC services with
CRUD. SEATS has one REST API, the API Gateway, and six gRPC services behind it (ADR-12), so the clip shows both at
once: every click in the web apps is a REST call in Chrome's Network panel, and every REST call is one gRPC call in
the terminal, where each service logs the calls it serves. The last part calls a gRPC service directly with grpcurl.

## Before recording (ten minutes)

```bash
npm install
# grpcurl for part 4 (Linux x86_64; other builds: https://github.com/fullstorydev/grpcurl/releases)
curl -sL https://github.com/fullstorydev/grpcurl/releases/download/v1.9.4/grpcurl_1.9.4_linux_x86_64.tar.gz | tar xz -C ~/.local/bin grpcurl
```

Three terminals, side by side with Chrome:

| Terminal | Command | Shows |
|---|---|---|
| A, the widest | `npm run dev` | the seven processes with coloured prefixes. Every process logs two lines per call, `req` when it arrives and `res` when it is answered, each with the call's number in that process (from 1 at every restart) and the time to the millisecond: `[gateway]` the REST request and the gRPC method behind it, `[round]`, `[tables]`, `[booking]` … the gRPC calls they serve. The lines of nested calls interleave, so a request's `req` and `res` enclose the calls it caused |
| B | `npm run dev:backoffice` then `npm run dev:customer` (two tabs, or `&`) | the two web apps on :5174 and :5173, proxying `/api` to the gateway |
| C | the scripts of parts 2 and 4 | `curl` and `grpcurl` |

Chrome: window 1 the back-office at http://localhost:5174 signed in as `manager` / `manager`, window 2 the customer app
at http://localhost:5173, window 3 an incognito window on the customer app for the second customer. In windows 1 and 2
open DevTools (F12), Network tab, filter `api`, tick **Preserve log**, and pick **Fetch/XHR**. Clicking a row shows
Headers (the identity goes as `x-user-id` and `x-role`, fake auth of progress 1), Payload and Response.

The stores are in memory: a restart of terminal A is a clean slate. Off camera, right before the take, seed the demo
data through the API in terminal C:

```bash
npm run demo:seed
```

It makes three table types, the zone map "Main hall" (Active, two zones, twelve tables), three Published rounds on
the next three Saturdays and, on the first one, three customers holding tables 1, 5 and 8, so both apps look real
from the first frame. The holds last 15 minutes (BRULE-02): seed right before recording, and seed again after any
restart of A. A second run on the same backend changes nothing. Do one dry run, then restart A, seed, record.

### Recording from a GitHub Codespace

The processes run in the Codespace; Chrome runs on your machine, so the two app ports must be forwarded. Only 5173
and 5174 are needed: the dev servers proxy `/api` to the gateway inside the Codespace, and the curl and grpcurl
calls run in its terminals.

- **VS Code desktop attached to the Codespace** (the simplest): the ports forward themselves when the servers start
  and appear as `localhost:5173` and `localhost:5174` on your machine, so every URL in this runbook works unchanged,
  the incognito window included. If one is missing, the Ports panel (**Ports** tab next to the terminal, or
  **Forward a Port**) adds it.
- **The browser-based editor**: the Ports panel gives `https://<codespace>-5173.app.github.dev` and `…-5174…` instead
  of localhost; the Vite configs allow that name. For the Codespace this runbook was written in they are
  <https://vigilant-fishstick-r79q4jq4gqvc446-5174.app.github.dev> (back-office) and
  <https://vigilant-fishstick-r79q4jq4gqvc446-5173.app.github.dev> (customer app). A private port asks the browser to sign in to GitHub, which the
  incognito window cannot do with your cookie: set the two ports to **Public** for the take (right-click the port,
  Port Visibility), and back to Private afterwards.

Terminal A, B and C are then the Codespace's terminals, and the screen recorder captures Chrome and VS Code on your
machine.

## The storyboard (4:45)

### 0:00 The architecture (30 s)

On screen: Figure 5.1 of the document, then terminal A. Say: three parts, the web apps, the API Gateway as the only
REST API, six gRPC services each with its own database; the gateway translates one REST route into one gRPC method.
Point at the seven `gRPC on :500x` lines and run in C:

```bash
curl -s localhost:4000/health | jq .
```

### 0:30 REST CRUD through the gateway: zone maps and rounds (90 s)

Back-office window, DevTools open. Each click, then the Network row, then the matching line in A.

| Click | REST (Network panel) | gRPC (terminal A) |
|---|---|---|
| Zone maps, type "Garden stage", **+ New map** | `POST /api/zone-maps` 200 | `[round] #n … req manager:… CreateZoneMap` then `res CreateZoneMap OK` |
| **+ Add zone** "Front stage", **+ Add table** twice (1 sofa, 2 round), **Save** | `PUT /api/zone-maps/:id` 200 | `UpdateZoneMap` req and res |
| **Activate** | `POST /api/zone-maps/:id/activate` 200 | `ActivateZoneMap` req and res |
| Concert rounds, "Friday Live", **+ New round** | `POST /api/rounds` 200 | `CreateRound` req and res |
| artist, a weekday date (the seeded rounds take the Saturdays and a published round may not overlap another), doors, start, booking opens; zone map "Garden stage"; the two prices; **Save draft** | `PUT /api/rounds/:id` 200 | `UpdateRound` req and res |
| **Validate**, then **Publish** | `POST …/validate`, `POST …/publish` 200 | `[round] req PublishRound`, inside it `[tables] req` and `res CreateRoundTableStatus OK`, then `[round] res PublishRound OK`: one gRPC service calling another |
| "scratch", **+ New round**, **Discard**, confirm | `DELETE /api/rounds/:id` 200 | `DiscardDraftRound` req and res |

Say at the publish: the Concert Round Service creates the table map of the round in the Table Availability Service,
service to service over gRPC, which is why the `[tables]` pair sits between the `req` and the `res` of `[round]`. Say at the delete: a published round
refuses it with 409 (the `res` line says `FAILED_PRECONDITION only a Draft round can be discarded`), which you can show by
clicking Discard on the published one if there is time; the UI hides the button, so use C:

```bash
curl -s -X DELETE -H 'x-user-id: manager-nok' -H 'x-role: manager' localhost:4000/api/rounds/<published id>
```

### 2:00 Create Booking: the hold across three services (75 s)

Customer window. Log in with a new LINE user id (`U-nok`, **Allow**; the seeded customers already hold tables),
**Select this round** on "Saturday Live: The Band", where tables 1, 5 and 8 show as held, and tap table 2. (The
round published a minute ago works the same; the seeded one shows the map with other customers' holds.)

Terminal A, in this order, one REST request and three gRPC calls nested in it (the numbers are per process):

```
[gateway]  [gateway] #17 17:03:30.038 req customer:U-nok POST /api/bookings -> gRPC Bookings/CreateHeldBooking
[booking]  [booking] #1 17:03:30.041 req customer:U-nok CreateHeldBooking
[round]    [concert-round] #16 17:03:30.055 req GetRound
[round]    [concert-round] #16 17:03:30.056 res GetRound OK (0 ms)
[tables]   [table-availability] #4 17:03:30.069 req HoldTable
[tables]   [table-availability] #4 17:03:30.070 res HoldTable OK (1 ms)
[booking]  [booking] #1 17:03:30.072 res CreateHeldBooking OK (31 ms)
[gateway]  [gateway] #17 17:03:30.077 res POST /api/bookings 200 (39 ms)
```

Say: the Booking Service asks the Concert Round Service whether booking is open, takes the table (first lock wins,
the lock is in its own database, ADR-13) and tells the Table Availability Service, whose map every customer polls
every two seconds (the `GET …/table-status` rows answered 304 in the Network panel).

Incognito window: log in as `U-ploy`, select the same round, tap the same table 2: the toast says the table has just
been taken, the Network row is 409, the `[booking] res` line says `CreateHeldBooking FAILED_PRECONDITION the table has just
been taken by another customer` and the gateway's `res` line ends with the same words after its 409. Back in the first window: party size 7 (`PUT …/party-size`, the fee), then **Cancel**:
`[tables] req ReleaseHold` and `res ReleaseHold OK` and the table turns available in the other window within two seconds.

### 3:15 gRPC CRUD directly on the Table Availability Service (60 s)

Terminal C:

```bash
demo/grpc-demo.sh
```

Health check, then C `CreateRoundTableStatus`, R `GetRoundTableStatus` and `CountAvailableTables`, U `HoldTable` (the
second hold is refused with FAILED_PRECONDITION), `MarkTableBooked`, `MarkTableOccupied`, D `RemoveRoundTableStatus`
refused while a table is booked, `ReleaseHold` idempotent. Terminal A logs each call as a `req` and `res` pair with no caller: nothing came
through the gateway. Say: the contract is the `.proto` file, which grpcurl reads; the same methods the Booking Service
called a minute ago.

### 4:15 Git and the deployment (30 s)

The repository <https://github.com/cuse-software-engineering/SEATS>: its contributors graph
(<https://github.com/cuse-software-engineering/SEATS/graphs/contributors>) and the branches; the same backend on
Render (<https://seats-monolith.onrender.com/health>) and the two apps on Vercel
(<https://seats-back-office.vercel.app>, <https://seats-customer.vercel.app>).

## Fallbacks

- The all-curl version of parts 2 and 3 is `demo/rest-demo.sh` (needs jq): the same CRUD and the same booking flow
  as readable calls, with terminal A logging the gRPC behind each.
- A take goes wrong: Ctrl-C in A, `npm run dev` again, `npm run demo:seed`, record again.
- The deployment instead of localhost: `npm run demo:reset` empties the Render backend and seeds it (needs
  `DEMO_RESET_TOKEN` from the Render dashboard); the Vercel apps then show the same data, but the service logs are
  one process there (monolith mode), so the gRPC part of the video needs the local `npm run dev`.
- The gateway alone with the services in one process is `npm run dev:mono` (ADR-14), but then there is no gRPC on
  the wire and no per-service log: use `npm run dev` for the video.
