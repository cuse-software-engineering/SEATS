#!/usr/bin/env bash
# Deliverable 3 demo, part 3: CRUD on the Table Availability Service over gRPC with grpcurl (no reflection needed:
# the contract file is passed). Install: https://github.com/fullstorydev/grpcurl/releases
set -euo pipefail
cd "$(dirname "$0")/.."
ADDR=${TABLE_AVAILABILITY_GRPC:-localhost:5003}
SVC=seats.tableavailability.v1.TableAvailability
g() { grpcurl -plaintext -import-path proto -proto table_availability.proto -d "$2" "$ADDR" "$SVC/$1"; }
step() { printf '\n\033[1;35m== %s\033[0m\n' "$*"; }

step "C  CreateRoundTableStatus"; g CreateRoundTableStatus '{"round_id":"demo-round","tables":[{"table_number":1,"for_sale":true},{"table_number":2,"for_sale":true},{"table_number":3,"for_sale":false}]}'
step "R  GetRoundTableStatus";        g GetRoundTableStatus '{"round_id":"demo-round"}'
step "R  CountAvailableTables";       g CountAvailableTables '{"round_ids":["demo-round","unknown"]}'
step "U  HoldTable (first lock wins)"; g HoldTable '{"round_id":"demo-round","table_number":1,"booking_id":"b-1","hold_ends_at":"2026-10-03T20:15:00Z"}'
step "U  HoldTable again -> FAILED_PRECONDITION"; g HoldTable '{"round_id":"demo-round","table_number":1,"booking_id":"b-2"}' || true
step "U  MarkTableBooked";            g MarkTableBooked '{"round_id":"demo-round","table_number":1,"booking_id":"b-1"}'
step "U  MarkTableOccupied";          g MarkTableOccupied '{"round_id":"demo-round","table_number":1,"booking_id":"b-1"}'
step "D  RemoveRoundTableStatus -> refused while a table is booked"; g RemoveRoundTableStatus '{"round_id":"demo-round"}' || true
step "U  ReleaseHold on table 2 is a no-op (idempotent)"; g ReleaseHold '{"round_id":"demo-round","table_number":2}'
