// Shared by the test files of the Booking Service (one per domain file): the round and the tables the Concert Round
// Service would answer, the stubs of the collaborators (set on the client objects themselves: the ports delegate to the
// current method, so a stub set after wire() is followed), the calls the read model received, and the `rejected`
// check of a DomainError. Not a test file: the runner takes test/*.test.ts only.
import assert from 'node:assert/strict';
import * as d from '../src/domain/index.js';
import { concertRound, tableAvailability } from '../src/infrastructure/clients.js';
import type { Round__Output } from '@seats/proto/gen/seats/concertround/v1/Round';
import type { RoundTable__Output } from '@seats/proto/gen/seats/concertround/v1/RoundTable';
import type { TableRef } from '@seats/proto/gen/seats/tableavailability/v1/TableRef';
import type { HoldTableRequest } from '@seats/proto/gen/seats/tableavailability/v1/HoldTableRequest';
import type { TableStatus__Output } from '@seats/proto/gen/seats/tableavailability/v1/TableStatus';

/** The promise is refused by a DomainError of this kind and, when given, with a message matching `message`. */
export const rejected = (p: Promise<unknown>, kind: d.DomainError['kind'], message?: RegExp) =>
  assert.rejects(p, (e: unknown) => {
    assert.ok(e instanceof d.DomainError, `expected a DomainError, got ${e instanceof Error ? e.stack : String(e)}`);
    assert.equal(e.kind, kind, `kind of "${e.message}"`);
    if (message) assert.match(e.message, message);
    return true;
  });

export const SOMCHAI = 'U-somchai', MALEE = 'U-malee';
export const PAST = '2026-01-01T00:00:00.000Z';
export const MINUTE = 60e3;
export const iso = (t: number): string => new Date(t).toISOString();

/** Table 1: a 6-seat sofa at 7,200 (BRULE-08); every other table: a 2-seat round at 2,400. Table 3 is not for sale. */
export const table = (tableNumber: number, forSale = true): RoundTable__Output => ({ tableNumber, zoneId: 'A', zoneName: 'Zone A', tableTypeId: tableNumber === 1 ? 'sofa6' : 'round2', tableTypeName: '', capacity: tableNumber === 1 ? 6 : 2, forSale, x: 0, y: 0, packagePrice: tableNumber === 1 ? 7200 : 2400, packageContent: '' });
/** A Published round, open for booking since PAST, with a 15-minute hold (BRULE-02). */
export const round = (over: Partial<Round__Output> = {}): Round__Output => ({
  id: 'r1', name: 'Friday Live', artist: 'The Band', status: 'Published', date: '2026-12-24', doorsOpenAt: '2026-12-24T18:00:00.000Z', startAt: '2026-12-24T20:00:00.000Z', bookingOpenAt: PAST,
  zoneMapId: 'm1', tablesNotForSale: [3], prices: [], checkInWindow: null, parameters: null, createdAt: PAST, holdPeriodMinutes: 15, tables: [table(1), table(2), table(3, false)], ...over,
});
export const asTable = (req: TableRef | HoldTableRequest, status: string): TableStatus__Output => ({ tableNumber: req.tableNumber ?? 0, status, bookingId: req.bookingId ?? '', holdEndsAt: '' });
/** A refusal of a collaborator as its gRPC client passes it through (the domain reads it with refusalOf()). */
export const grpcError = (code: number, message = 'refused'): Error => Object.assign(new Error(message), { code });

/** What the stubbed Table Availability Service received. */
export const calls: { holds: HoldTableRequest[]; releases: TableRef[] } = { holds: [], releases: [] };

/** The collaborators as they answer by default: the round above, the package prices of its two table types with an
 *  extra-person fee of 600 (BRULE-09), the check-in window of BRULE-04/05, a read model that accepts every hold and
 *  release. Call it in beforeEach, after resetStore(). */
export function stubCollaborators(): void {
  calls.holds = []; calls.releases = [];
  concertRound.getRound = async () => round();
  concertRound.getRoundPricing = async (roundId) => ({ roundId, prices: [{ zoneId: 'A', tableTypeId: 'sofa6', packagePrice: 7200, packageContent: '' }, { zoneId: 'A', tableTypeId: 'round2', packagePrice: 2400, packageContent: '' }], extraPersonFee: 600 });
  concertRound.getCheckInWindow = async (roundId) => ({ roundId, opensAt: '2026-12-24T18:00:00.000Z', startAt: '2026-12-24T20:00:00.000Z', graceEndsAt: '2026-12-24T20:30:00.000Z' });
  tableAvailability.holdTable = async (req) => { calls.holds.push(req); return asTable(req, 'HELD'); };
  tableAvailability.releaseHold = async (req) => { calls.releases.push(req); return asTable(req, 'AVAILABLE'); };
}

/** Runs `run` with console.log and console.warn swallowed (the expiry job logs the notice it would send and its retries). */
export async function quietly<T>(run: () => Promise<T>): Promise<T> {
  const { log, warn } = console; console.log = () => {}; console.warn = () => {};
  try { return await run(); } finally { console.log = log; console.warn = warn; }
}

/** Expires the booking the way the service does: the job with a clock one minute past the hold end. */
export const expire = (b: d.BookingView): Promise<string[]> => quietly(() => d.expireUnpaidBookings(Date.parse(b.holdEndsAt) + MINUTE));
