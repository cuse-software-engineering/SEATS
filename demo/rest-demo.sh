#!/usr/bin/env bash
# Deliverable 3 demo, parts 1 and 2: REST CRUD on the Concert Round Service and the Create Booking flow,
# every call through the API Gateway (:4000). Needs curl and jq; start the services first (npm run dev).
set -euo pipefail
G=${GATEWAY:-http://localhost:4000}
MANAGER=(-H 'x-user-id: manager-nok' -H 'x-role: manager' -H 'content-type: application/json')
CUSTOMER=(-H 'x-user-id: U-line-somchai' -H 'x-role: customer' -H 'content-type: application/json')
OTHER=(-H 'x-user-id: U-line-malee' -H 'x-role: customer' -H 'content-type: application/json')
step() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }
DAYS=$((2 + RANDOM % 300))   # a random future date: a second run on the same in-memory state must not overlap the first round
DAY=$(date -u -d "+$DAYS day" +%F 2>/dev/null || date -u -v+${DAYS}d +%F)
OPEN=$(date -u -d '-1 minute' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-1M +%Y-%m-%dT%H:%M:%SZ)

step "Table types (defineTableType)"
curl -s "${MANAGER[@]}" -X PUT $G/api/table-types/round2 -d '{"name":"2-person round table","capacity":2,"packageContent":"1 bottle + mixers"}' | jq -c .
curl -s "${MANAGER[@]}" -X PUT $G/api/table-types/sofa6 -d '{"name":"6-person sofa","capacity":6,"packageContent":"2 bottles + mixers + snacks"}' | jq -c .

step "Zone map: create (C), upload image, update zones and tables (U), validate, activate"
MAP=$(curl -s "${MANAGER[@]}" -X POST $G/api/zone-maps -d '{"name":"Main hall"}' | jq -r .id); echo "zone map $MAP"
curl -s "${MANAGER[@]}" -X POST $G/api/zone-maps/$MAP/image -d '{"fileName":"main-hall.png"}' | jq -c '{imageUrl}'
curl -s "${MANAGER[@]}" -X PUT $G/api/zone-maps/$MAP -d '{"zones":[{"id":"A","name":"Zone A (front stage)"},{"id":"B","name":"Zone B"}],
  "tables":[{"tableNumber":1,"zoneId":"A","tableTypeId":"sofa6","capacity":6,"x":100,"y":80},{"tableNumber":2,"zoneId":"A","tableTypeId":"round2","capacity":2,"x":220,"y":80},
            {"tableNumber":3,"zoneId":"B","tableTypeId":"round2","capacity":2,"x":100,"y":200},{"tableNumber":4,"zoneId":"B","tableTypeId":"round2","capacity":2,"x":220,"y":200}]}' | jq -c '{status, summary}'
curl -s "${MANAGER[@]}" -X POST $G/api/zone-maps/$MAP/validate | jq -c .
curl -s "${MANAGER[@]}" -X POST $G/api/zone-maps/$MAP/activate | jq -c '{id, status}'
step "Zone map: read (R) and list"
curl -s "${MANAGER[@]}" $G/api/zone-maps/$MAP | jq -c '{name, status, zones: (.zones|length), tables: (.tables|length)}'
curl -s "${MANAGER[@]}" "$G/api/zone-maps?status=Active" | jq -c .

step "Round: create (C), update details, zone map and prices (U), validate, tables as the customer sees them, publish -> gRPC CreateRoundTableStatus"
ROUND=$(curl -s "${MANAGER[@]}" -X POST $G/api/rounds -d '{"name":"Friday Live"}' | jq -r .id); echo "round $ROUND"
curl -s "${MANAGER[@]}" -X PUT $G/api/rounds/$ROUND -d "{\"artist\":\"The Band\",\"date\":\"$DAY\",\"doorsOpenAt\":\"${DAY}T18:00:00Z\",\"startAt\":\"${DAY}T20:00:00Z\",\"bookingOpenAt\":\"$OPEN\",\"zoneMapId\":\"$MAP\",\"tablesNotForSale\":[4],
  \"prices\":[{\"zoneId\":\"A\",\"tableTypeId\":\"sofa6\",\"packagePrice\":7200,\"packageContent\":\"2 bottles\"},{\"zoneId\":\"A\",\"tableTypeId\":\"round2\",\"packagePrice\":2400,\"packageContent\":\"1 bottle\"},{\"zoneId\":\"B\",\"tableTypeId\":\"round2\",\"packagePrice\":1800,\"packageContent\":\"1 bottle\"}]}" | jq -c '{status, checkInWindow}'
curl -s "${MANAGER[@]}" -X POST $G/api/rounds/$ROUND/validate | jq -c .
curl -s "${MANAGER[@]}" $G/api/rounds/$ROUND/tables | jq -c '[.[] | select(.forSale) | {tableNumber, zoneName, packagePrice}]'
curl -s "${MANAGER[@]}" -X POST $G/api/rounds/$ROUND/publish | jq -c '{id, status, parameters, error, details}'

step "Customer: upcoming rounds (R) and the table map (polled read of the Table Availability Service)"
curl -s "${CUSTOMER[@]}" $G/api/rounds | jq -c .
curl -s "${CUSTOMER[@]}" $G/api/rounds/$ROUND/table-status | jq -c .

step "Customer: hold table 1 (createHeldBooking -> gRPC GetRound + HoldTable), party size 7 -> fee"
BOOKING=$(curl -s "${CUSTOMER[@]}" -X POST $G/api/bookings -d "{\"roundId\":\"$ROUND\",\"tableNumber\":1}" | jq -r .id); echo "booking $BOOKING"
curl -s "${CUSTOMER[@]}" -X PUT $G/api/bookings/$BOOKING/party-size -d '{"partySize":7}' | jq -c '{status, partySize, fee, remainingHoldSeconds}'
step "Another customer tries table 1: first lock wins (409)"
curl -s "${OTHER[@]}" -X POST $G/api/bookings -d "{\"roundId\":\"$ROUND\",\"tableNumber\":1}" | jq -c .
step "Profile (404 on the first booking, then create), terms, accept"
curl -s "${CUSTOMER[@]}" $G/api/customers/me | jq -c .
curl -s "${CUSTOMER[@]}" -X POST $G/api/customers/me -d '{"name":"Somchai","phone":"0812345678","consent":true}' | jq -c .
curl -s "${CUSTOMER[@]}" $G/api/bookings/$BOOKING/terms | jq -c '.terms'
curl -s "${CUSTOMER[@]}" -X POST $G/api/bookings/$BOOKING/terms-acceptance | jq -c '{status, termsAccepted}'
step "Payment is progress 2 (501); cancel releases the hold (gRPC ReleaseHold)"
curl -s "${CUSTOMER[@]}" -X POST $G/api/bookings/$BOOKING/payment | jq -c .
curl -s "${CUSTOMER[@]}" -X POST $G/api/bookings/$BOOKING/cancel | jq -c '{id, status}'
curl -s "${CUSTOMER[@]}" $G/api/rounds/$ROUND/table-status | jq -c '.tables[0]'
curl -s "${CUSTOMER[@]}" $G/api/customers/me/bookings | jq -c '[.[] | {id, status}]'

step "Delete (D): a Draft round is discarded; a Published one is refused"
DRAFT=$(curl -s "${MANAGER[@]}" -X POST $G/api/rounds -d '{"name":"scratch"}' | jq -r .id)
curl -s "${MANAGER[@]}" -X DELETE $G/api/rounds/$DRAFT | jq -c .
curl -s "${MANAGER[@]}" -X DELETE $G/api/rounds/$ROUND | jq -c .
step "Role check at the gateway: a customer may not publish (403)"
curl -s "${CUSTOMER[@]}" -X POST $G/api/rounds/$ROUND/publish | jq -c .
