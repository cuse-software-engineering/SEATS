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
| A, the widest | `npm run dev` | the seven processes with coloured prefixes: `[gateway]` logs every REST request and the gRPC method behind it, `[round]`, `[tables]`, `[booking]` … log every gRPC call they serve |
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
| Zone maps, type "Garden stage", **+ New map** | `POST /api/zone-maps` 200 | `[round] manager:… CreateZoneMap -> OK` |
| **+ Add zone** "Front stage", **+ Add table** twice (1 sofa, 2 round), **Save** | `PUT /api/zone-maps/:id` 200 | `UpdateZoneMap -> OK` |
| **Activate** | `POST /api/zone-maps/:id/activate` 200 | `ActivateZoneMap -> OK` |
| Concert rounds, "Friday Live", **+ New round** | `POST /api/rounds` 200 | `CreateRound -> OK` |
| artist, a weekday date (the seeded rounds take the Saturdays and a published round may not overlap another), doors, start, booking opens; zone map "Garden stage"; the two prices; **Save draft** | `PUT /api/rounds/:id` 200 | `UpdateRound -> OK` |
| **Validate**, then **Publish** | `POST …/validate`, `POST …/publish` 200 | `[tables] CreateRoundTableStatus -> OK` then `[round] PublishRound -> OK`: one gRPC service calling another |
| "scratch", **+ New round**, **Discard**, confirm | `DELETE /api/rounds/:id` 200 | `DiscardDraftRound -> OK` |

Say at the publish: the Concert Round Service creates the table map of the round in the Table Availability Service,
service to service over gRPC, which is why `[tables]` logs before `[round]`. Say at the delete: a published round
refuses it with 409 (the log says `FAILED_PRECONDITION only a Draft round can be discarded`), which you can show by
clicking Discard on the published one if there is time; the UI hides the button, so use C:

```bash
curl -s -X DELETE -H 'x-user-id: manager-nok' -H 'x-role: manager' localhost:4000/api/rounds/<published id>
```

### 2:00 Create Booking: the hold across three services (75 s)

Customer window. Log in with a new LINE user id (`U-nok`, **Allow**; the seeded customers already hold tables),
**Select this round** on "Saturday Live: The Band", where tables 1, 5 and 8 show as held, and tap table 2. (The
round published a minute ago works the same; the seeded one shows the map with other customers' holds.)

Terminal A, in this order, one REST call and three gRPC calls:

```
[round]    [concert-round] GetRound -> OK (0 ms)
[tables]   [table-availability] HoldTable -> OK (1 ms)
[booking]  [booking] customer:U-nok CreateHeldBooking -> OK (28 ms)
[gateway]  [gateway] customer:U-nok POST /api/bookings -> gRPC Bookings/CreateHeldBooking 200 (36 ms)
```

Say: the Booking Service asks the Concert Round Service whether booking is open, takes the table (first lock wins,
the lock is in its own database, ADR-13) and tells the Table Availability Service, whose map every customer polls
every two seconds (the `GET …/table-status` rows answered 304 in the Network panel).

Incognito window: log in as `U-ploy`, select the same round, tap the same table 2: the toast says the table has just
been taken, the Network row is 409, the log says `CreateHeldBooking -> FAILED_PRECONDITION the table has just been
taken by another customer`. Back in the first window: party size 7 (`PUT …/party-size`, the fee), then **Cancel**:
`[tables] ReleaseHold -> OK` and the table turns available in the other window within two seconds.

### 3:15 gRPC CRUD directly on the Table Availability Service (60 s)

Terminal C:

```bash
demo/grpc-demo.sh
```

Health check, then C `CreateRoundTableStatus`, R `GetRoundTableStatus` and `CountAvailableTables`, U `HoldTable` (the
second hold is refused with FAILED_PRECONDITION), `MarkTableBooked`, `MarkTableOccupied`, D `RemoveRoundTableStatus`
refused while a table is booked, `ReleaseHold` idempotent. Terminal A logs each call with no caller: nothing came
through the gateway. Say: the contract is the `.proto` file, which grpcurl reads; the same methods the Booking Service
called a minute ago.

### 4:15 Git and the deployment (30 s)

The GitHub contributors graph and the branches; the same backend on Render and the two apps on Vercel
(`https://seats-back-office.vercel.app`, `https://seats-customer.vercel.app`).

## Fallbacks

- The all-curl version of parts 2 and 3 is `demo/rest-demo.sh` (needs jq): the same CRUD and the same booking flow
  as readable calls, with terminal A logging the gRPC behind each.
- A take goes wrong: Ctrl-C in A, `npm run dev` again, `npm run demo:seed`, record again.
- The deployment instead of localhost: `npm run demo:reset` empties the Render backend and seeds it (needs
  `DEMO_RESET_TOKEN` from the Render dashboard); the Vercel apps then show the same data, but the service logs are
  one process there (monolith mode), so the gRPC part of the video needs the local `npm run dev`.
- The gateway alone with the services in one process is `npm run dev:mono` (ADR-14), but then there is no gRPC on
  the wire and no per-service log: use `npm run dev` for the video.
