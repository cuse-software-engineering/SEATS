// Unit tests of the Table Availability Service domain (no collaborators): the read model of the table map (ADR-13),
// src/domain/table-status.ts. The first describes are the worked examples; the describes after the rule "the test
// tables" are systematic: state-transition testing (status x event), equivalence classes with their boundaries, and
// the polled version of ADR-09. Each of those carries its table in the header comment (class | input | expected) and
// runs one `test` per row; every name reads "<cell or class>: <input> -> <expected>".
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain/index.js';
import { resetStore, wire } from '../src/infrastructure/index.js';

wire();   // binds the in-memory repositories to the domain's ports once

const ROUND = { roundId: 'r1', tables: [{ tableNumber: 1 }, { tableNumber: 2, forSale: true }, { tableNumber: 3, forSale: false }] };
const ref = (tableNumber: number, bookingId = 'b1') => ({ roundId: 'r1', tableNumber, bookingId });
const refused = (fn: () => Promise<unknown>, kind: d.DomainError['kind']) => assert.rejects(fn, (e: unknown) => e instanceof d.DomainError && e.kind === kind);
const statusOf = async (tableNumber: number) => (await d.getRoundTableStatus({ roundId: 'r1' })).tables.find((t) => t.tableNumber === tableNumber)?.status;

beforeEach(async () => { await resetStore(); });

describe('createRoundTableStatus', () => {
  test('creates the document with AVAILABLE and NOT_FOR_SALE tables', async () => {
    const r = await d.createRoundTableStatus(ROUND);
    assert.equal(r.roundId, 'r1');
    assert.equal(r.version, 1);
    assert.deepEqual(r.tables.map((t) => [t.tableNumber, t.status]), [[1, 'AVAILABLE'], [2, 'AVAILABLE'], [3, 'NOT_FOR_SALE']]);
  });
  test('is idempotent: a second call keeps the existing document', async () => {
    await d.createRoundTableStatus(ROUND);
    await d.holdTable(ref(1));
    const again = await d.createRoundTableStatus({ roundId: 'r1', tables: [{ tableNumber: 9 }] });
    assert.equal(again.version, 2);
    assert.equal(again.tables.length, 3);
    assert.equal(await statusOf(1), 'HELD');
  });
  test('refuses an empty request', async () => {
    await refused(() => d.createRoundTableStatus({ roundId: '', tables: [{ tableNumber: 1 }] }), 'invalid');
    await refused(() => d.createRoundTableStatus({ roundId: 'r1', tables: [] }), 'invalid');
  });
});

describe('holdTable', () => {
  beforeEach(async () => { await d.createRoundTableStatus(ROUND); });
  test('AVAILABLE -> HELD with the booking and the hold end', async () => {
    const t = await d.holdTable({ ...ref(1), holdEndsAt: '2026-10-01T10:15:00.000Z' });
    assert.deepEqual(t, { tableNumber: 1, status: 'HELD', bookingId: 'b1', holdEndsAt: '2026-10-01T10:15:00.000Z' });
  });
  test('a second hold on the same table by another booking is refused', async () => {
    await d.holdTable(ref(1));
    await refused(() => d.holdTable(ref(1, 'b2')), 'conflict');
    assert.equal((await d.getRoundTableStatus({ roundId: 'r1' })).tables[0].bookingId, 'b1');
  });
  test('needs a booking id, a known round and a known table; a table not for sale cannot be held', async () => {
    await refused(() => d.holdTable({ roundId: 'r1', tableNumber: 1, bookingId: '' }), 'invalid');
    await refused(() => d.holdTable({ ...ref(1), roundId: 'nope' }), 'not_found');
    await refused(() => d.holdTable(ref(42)), 'not_found');
    await refused(() => d.holdTable(ref(3)), 'conflict');
  });
});

describe('releaseHold', () => {
  beforeEach(async () => { await d.createRoundTableStatus(ROUND); });
  test('HELD -> AVAILABLE and the booking is cleared', async () => {
    await d.holdTable(ref(1));
    const t = await d.releaseHold(ref(1));
    assert.deepEqual(t, { tableNumber: 1, status: 'AVAILABLE', bookingId: '', holdEndsAt: '' });
  });
  test('is a no-op on an AVAILABLE table (the expiry job may retry)', async () => {
    const before = (await d.getRoundTableStatus({ roundId: 'r1' })).version;
    assert.equal((await d.releaseHold(ref(2))).status, 'AVAILABLE');
    assert.equal((await d.getRoundTableStatus({ roundId: 'r1' })).version, before);
  });
  test('is refused with another booking id', async () => {
    await d.holdTable(ref(1));
    await refused(() => d.releaseHold(ref(1, 'b2')), 'conflict');
    assert.equal(await statusOf(1), 'HELD');
  });
});

describe('markTableBooked and markTableOccupied', () => {
  beforeEach(async () => { await d.createRoundTableStatus(ROUND); });
  test('HELD -> BOOKED -> OCCUPIED', async () => {
    await d.holdTable({ ...ref(1), holdEndsAt: '2026-10-01T10:15:00.000Z' });
    const booked = await d.markTableBooked(ref(1));
    assert.equal(booked.status, 'BOOKED');
    assert.equal(booked.holdEndsAt, '');
    assert.equal(booked.bookingId, 'b1');
    assert.equal((await d.markTableOccupied(ref(1))).status, 'OCCUPIED');
  });
  test('wrong-state transitions are refused', async () => {
    await refused(() => d.markTableBooked(ref(1)), 'conflict');        // AVAILABLE, not HELD
    await refused(() => d.markTableOccupied(ref(1)), 'conflict');      // AVAILABLE, not BOOKED
    await d.holdTable(ref(1));
    await refused(() => d.markTableOccupied(ref(1)), 'conflict');      // HELD, not BOOKED
    await refused(() => d.markTableBooked(ref(1, 'b2')), 'conflict');  // another booking
    await d.markTableBooked(ref(1));
    await refused(() => d.releaseHold(ref(1)), 'conflict');            // BOOKED is not released
    await refused(() => d.holdTable(ref(1, 'b2')), 'conflict');
  });
});

describe('countAvailableTables', () => {
  test('counts the available and the for-sale tables per round; unknown rounds give zeros', async () => {
    await d.createRoundTableStatus(ROUND);
    await d.holdTable(ref(1));
    assert.deepEqual((await d.countAvailableTables({ roundIds: ['r1', 'unknown'] })).counts, [
      { roundId: 'r1', available: 1, forSale: 2 },
      { roundId: 'unknown', available: 0, forSale: 0 },
    ]);
  });
});

describe('removeRoundTableStatus', () => {
  beforeEach(async () => { await d.createRoundTableStatus(ROUND); });
  test('is refused while a table is held or booked', async () => {
    await d.holdTable(ref(1));
    await refused(() => d.removeRoundTableStatus({ roundId: 'r1' }), 'conflict');
    await d.markTableBooked(ref(1));
    await refused(() => d.removeRoundTableStatus({ roundId: 'r1' }), 'conflict');
  });
  test('removes the document otherwise; an unknown round is not removed', async () => {
    assert.deepEqual(await d.removeRoundTableStatus({ roundId: 'r1' }), { removed: true });
    await refused(() => d.getRoundTableStatus({ roundId: 'r1' }), 'not_found');
    assert.deepEqual(await d.removeRoundTableStatus({ roundId: 'r1' }), { removed: false });
  });
});

describe('version', () => {
  test('grows on every change and not on a read or a no-op', async () => {
    await d.createRoundTableStatus(ROUND);
    const v = async () => (await d.getRoundTableStatus({ roundId: 'r1' })).version;
    assert.equal(await v(), 1);
    await d.holdTable(ref(1)); assert.equal(await v(), 2);
    await d.markTableBooked(ref(1)); assert.equal(await v(), 3);
    await d.markTableOccupied(ref(1)); assert.equal(await v(), 4);
    await d.holdTable(ref(2)); assert.equal(await v(), 5);
    await d.releaseHold(ref(2)); assert.equal(await v(), 6);
    await d.releaseHold(ref(2)); assert.equal(await v(), 6);
    await d.countAvailableTables({ roundIds: ['r1'] }); assert.equal(await v(), 6);
  });
});

// ------------------------------------------------------------------------------------------------- the test tables
const ENDS = '2026-10-01T10:15:00.000Z';
const round = (roundId = 'r1') => d.getRoundTableStatus({ roundId });
const version = async () => (await round()).version;
const count = async (roundIds: string[]) => (await d.countAvailableTables({ roundIds })).counts;
const one = (tableNumber: number, forSale?: boolean) => ({ roundId: 'r1', tables: [{ tableNumber, forSale }] });
const R2 = { roundId: 'r2', tables: [{ tableNumber: 7 }] };
type Event = 'holdTable' | 'releaseHold' | 'markTableBooked' | 'markTableOccupied';
const EVENTS: Event[] = ['holdTable', 'releaseHold', 'markTableBooked', 'markTableOccupied'];
const EVENT: Record<Event, (r: { roundId: string; tableNumber: number; bookingId?: string }) => Promise<d.TableStatus>> =
  { holdTable: d.holdTable, releaseHold: d.releaseHold, markTableBooked: d.markTableBooked, markTableOccupied: d.markTableOccupied };
type Case = [name: string, run: () => Promise<void>];

/** Drives table 1 of r1 (held by b1) to `state` and answers its number; NOT_FOR_SALE is table 3, which no event reaches. */
async function reach(state: d.TableStatusValue): Promise<number> {
  await d.createRoundTableStatus(ROUND);
  if (state === 'NOT_FOR_SALE') return 3;
  if (state !== 'AVAILABLE') await d.holdTable({ ...ref(1), holdEndsAt: ENDS });
  if (state === 'BOOKED' || state === 'OCCUPIED') await d.markTableBooked(ref(1));
  if (state === 'OCCUPIED') await d.markTableOccupied(ref(1));
  return 1;
}

type Outcome = d.TableStatusValue | 'no-op' | 'conflict' | 'invalid';
type Cell = [state: d.TableStatusValue, event: Event, bookingId: string | undefined, expected: Outcome];
const idOf = (bookingId: string | undefined) => (bookingId === undefined ? 'none' : bookingId === '' ? "''" : bookingId);
/** One cell: fires `event` on a table in `state`. A refusal leaves the whole document as it was; a transition changes
 *  that one table and bumps the version exactly once; a no-op answers the table as it is and changes nothing. */
async function fireCell([state, event, bookingId, expected]: Cell): Promise<void> {
  const tableNumber = await reach(state);
  const before = await round();
  const call = () => EVENT[event]({ roundId: 'r1', tableNumber, bookingId });
  if (expected === 'conflict' || expected === 'invalid') { await refused(call, expected); assert.deepEqual(await round(), before); return; }
  const to = expected === 'no-op' ? state : expected;
  assert.equal((await call()).status, to);
  const after = await round();
  assert.equal(after.tables.find((t) => t.tableNumber === tableNumber)?.status, to);
  assert.equal(after.version, before.version + (expected === 'no-op' ? 0 : 1));
  assert.deepEqual(after.tables.filter((t) => t.tableNumber !== tableNumber), before.tables.filter((t) => t.tableNumber !== tableNumber));
}

// Status x event (BRULE-03, ADR-08, ADR-13). A cell is the status after the event, `conflict` when the rule refuses it
// (the document is untouched), `no-op` when the table is answered as it is (releaseHold is idempotent for the expiry
// job, ADR-08). A transition bumps `version` exactly once. The event's bookingId is the holder's (b1) on a taken
// table, none on a free one; a hold on a taken table comes from another booking (b2); the booking-id rules themselves
// are the next table.
//
//   status        | holdTable  | releaseHold | markTableBooked | markTableOccupied
//   --------------+------------+-------------+-----------------+------------------
//   AVAILABLE     | HELD       | no-op       | conflict        | conflict
//   HELD          | conflict   | AVAILABLE   | BOOKED          | conflict
//   BOOKED        | conflict   | conflict    | conflict        | OCCUPIED
//   OCCUPIED      | conflict   | conflict    | conflict        | conflict
//   NOT_FOR_SALE  | conflict   | conflict    | conflict        | conflict
const MATRIX: Cell[] = [
  ['AVAILABLE',    'holdTable',         'b1',      'HELD'],
  ['AVAILABLE',    'releaseHold',       undefined, 'no-op'],
  ['AVAILABLE',    'markTableBooked',   undefined, 'conflict'],
  ['AVAILABLE',    'markTableOccupied', undefined, 'conflict'],
  ['HELD',         'holdTable',         'b2',      'conflict'],
  ['HELD',         'releaseHold',       'b1',      'AVAILABLE'],
  ['HELD',         'markTableBooked',   'b1',      'BOOKED'],
  ['HELD',         'markTableOccupied', 'b1',      'conflict'],
  ['BOOKED',       'holdTable',         'b2',      'conflict'],
  ['BOOKED',       'releaseHold',       'b1',      'conflict'],
  ['BOOKED',       'markTableBooked',   'b1',      'conflict'],
  ['BOOKED',       'markTableOccupied', 'b1',      'OCCUPIED'],
  ['OCCUPIED',     'holdTable',         'b2',      'conflict'],
  ['OCCUPIED',     'releaseHold',       'b1',      'conflict'],
  ['OCCUPIED',     'markTableBooked',   'b1',      'conflict'],
  ['OCCUPIED',     'markTableOccupied', 'b1',      'conflict'],
  ['NOT_FOR_SALE', 'holdTable',         'b1',      'conflict'],
  ['NOT_FOR_SALE', 'releaseHold',       undefined, 'conflict'],
  ['NOT_FOR_SALE', 'markTableBooked',   undefined, 'conflict'],
  ['NOT_FOR_SALE', 'markTableOccupied', undefined, 'conflict'],
];
describe('state transitions: status x event', () => {
  for (const c of MATRIX) test(`${c[0]} x ${c[1]}: bookingId ${idOf(c[2])} -> ${c[3]}`, () => fireCell(c));
});

// The booking id of an event against the booking on the table (ADR-13: the Booking Service owns the hold, the
// projection only checks it is the same booking). Table 1 is held by b1.
//
//   class                    | input                                              | expected
//   -------------------------+----------------------------------------------------+------------------------------------------------
//   release, wrong id        | HELD by b1, releaseHold b2                         | conflict, still HELD by b1
//   release, right id        | HELD by b1, releaseHold b1                         | AVAILABLE
//   release, no id           | HELD by b1, releaseHold none (the expiry job)      | AVAILABLE
//   release, wrong id, free  | AVAILABLE, releaseHold b2                          | no-op: nothing to compare with
//   book, wrong id           | HELD by b1, markTableBooked b2                     | conflict
//   book, right id           | HELD by b1, markTableBooked b1                     | BOOKED
//   book, no id              | HELD by b1, markTableBooked none                   | BOOKED
//   occupy, wrong id         | BOOKED by b1, markTableOccupied b2                 | conflict
//   occupy, right id         | BOOKED by b1, markTableOccupied b1                 | OCCUPIED
//   occupy, no id            | BOOKED by b1, markTableOccupied none               | OCCUPIED
//   hold, same id            | HELD by b1, holdTable b1 (the hold reported again) | conflict: only AVAILABLE is held, no retry
//   hold, no id              | AVAILABLE, holdTable ''                            | invalid, before any lookup
const BOOKING_ID: [label: string, cell: Cell][] = [
  ['release, wrong id',       ['HELD',      'releaseHold',       'b2',      'conflict']],
  ['release, right id',       ['HELD',      'releaseHold',       'b1',      'AVAILABLE']],
  ['release, no id',          ['HELD',      'releaseHold',       undefined, 'AVAILABLE']],
  ['release, wrong id, free', ['AVAILABLE', 'releaseHold',       'b2',      'no-op']],
  ['book, wrong id',          ['HELD',      'markTableBooked',   'b2',      'conflict']],
  ['book, right id',          ['HELD',      'markTableBooked',   'b1',      'BOOKED']],
  ['book, no id',             ['HELD',      'markTableBooked',   undefined, 'BOOKED']],
  ['occupy, wrong id',        ['BOOKED',    'markTableOccupied', 'b2',      'conflict']],
  ['occupy, right id',        ['BOOKED',    'markTableOccupied', 'b1',      'OCCUPIED']],
  ['occupy, no id',           ['BOOKED',    'markTableOccupied', undefined, 'OCCUPIED']],
  ['hold, same id',           ['HELD',      'holdTable',         'b1',      'conflict']],
  ['hold, no id',             ['AVAILABLE', 'holdTable',         '',        'invalid']],
];
describe('state transitions: booking id', () => {
  for (const [label, c] of BOOKING_ID) test(`${label}: ${c[0]}${c[0] === 'AVAILABLE' || c[0] === 'NOT_FOR_SALE' ? '' : ' by b1'}, ${c[1]} ${idOf(c[2])} -> ${c[3]}`, () => fireCell(c));
});

// createRoundTableStatus and the lookups: the classes of the round, of the table list and of the table number, with
// their boundaries (0 and -1 next to the lowest table number in use, the empty list, the one-table list).
//
//   class                       | input                                        | expected
//   ----------------------------+----------------------------------------------+----------------------------------------------------
//   create, no round id         | roundId '', tables [1]                       | invalid
//   create, no table list       | roundId r1, tables missing                   | invalid
//   create, empty table list    | roundId r1, tables []                        | invalid
//   create, one table           | tables [1], forSale omitted                  | version 1, [1 AVAILABLE] (for sale by default)
//   create, forSale false only  | tables [{3, false}]                          | [3 NOT_FOR_SALE]
//   create, table number 0      | tables [0]                                   | accepted as given (the rule has no lower bound)
//   create, negative number     | tables [-1]                                  | accepted as given
//   create, duplicate round     | r1 twice, other tables the second time       | the first document, unchanged (idempotent, UC-03 EF-2)
//   create, after remove        | create, remove, create [9]                   | a new document: version 1, [9]
//   create, two rounds          | r1 and r2, hold in r1                        | r2 untouched: separate documents
//   get, unknown round          | getRoundTableStatus nope                     | not_found
//   get, removed round          | create, remove, get                          | not_found
//   get, order                  | tables [3, 1, 2]                             | [1, 2, 3], sorted by table number
//   <event>, unknown round      | roundId nope (each of the four events)       | not_found
//   <event>, unknown table      | table 42, 0, -1 of r1 (each event)           | not_found, before the booking-id check
//   remove, unknown round       | removeRoundTableStatus nope                  | { removed: false }
//   remove, twice               | r1 removed again                             | { removed: false } the second time
//   remove, freed again         | 1 held then released                         | { removed: true }
//   remove, OCCUPIED table      | 1 occupied                                   | conflict, the document stays
//   remove, only NOT_FOR_SALE   | tables [{3, false}]                          | { removed: true }
//   remove, other round busy    | r2 held, remove r1                           | { removed: true }: rounds are independent
const asCreate = (req: object) => req as Parameters<typeof d.createRoundTableStatus>[0];   // a request with a field missing, as JavaScript may send it
const CLASSES: Case[] = [
  ['create, no round id: roundId \'\', tables [1] -> invalid', () => refused(() => d.createRoundTableStatus({ roundId: '', tables: [{ tableNumber: 1 }] }), 'invalid')],
  ['create, no table list: tables missing -> invalid', () => refused(() => d.createRoundTableStatus(asCreate({ roundId: 'r1' })), 'invalid')],
  ['create, empty table list: tables [] -> invalid', () => refused(() => d.createRoundTableStatus({ roundId: 'r1', tables: [] }), 'invalid')],
  ['create, one table: tables [1], forSale omitted -> version 1, [1 AVAILABLE]', async () => assert.deepEqual(await d.createRoundTableStatus(one(1)), { roundId: 'r1', version: 1, tables: [{ tableNumber: 1, status: 'AVAILABLE', bookingId: '', holdEndsAt: '' }] })],
  ['create, forSale false only: tables [{3, false}] -> [3 NOT_FOR_SALE]', async () => assert.deepEqual((await d.createRoundTableStatus(one(3, false))).tables.map((t) => [t.tableNumber, t.status]), [[3, 'NOT_FOR_SALE']])],
  ['create, table number 0: tables [0] -> accepted as given', async () => { await d.createRoundTableStatus(one(0)); assert.equal((await d.holdTable(ref(0))).tableNumber, 0); assert.equal(await statusOf(0), 'HELD'); }],
  ['create, negative number: tables [-1] -> accepted as given', async () => { await d.createRoundTableStatus(one(-1)); assert.equal(await statusOf(-1), 'AVAILABLE'); }],
  ['create, duplicate round: r1 twice, other tables the second time -> the first document, unchanged', async () => { const first = await d.createRoundTableStatus(ROUND); assert.deepEqual(await d.createRoundTableStatus(one(9)), first); assert.deepEqual(await round(), first); }],
  ['create, after remove: create, remove, create [9] -> a new document, version 1, [9]', async () => { await d.createRoundTableStatus(ROUND); await d.removeRoundTableStatus({ roundId: 'r1' }); const r = await d.createRoundTableStatus(one(9)); assert.equal(r.version, 1); assert.deepEqual(r.tables.map((t) => t.tableNumber), [9]); }],
  ['create, two rounds: r1 and r2, hold in r1 -> r2 untouched', async () => { await d.createRoundTableStatus(ROUND); await d.createRoundTableStatus(R2); await d.holdTable(ref(1)); assert.deepEqual(await round('r2'), { roundId: 'r2', version: 1, tables: [{ tableNumber: 7, status: 'AVAILABLE', bookingId: '', holdEndsAt: '' }] }); }],
  ['get, unknown round: nope -> not_found', () => refused(() => round('nope'), 'not_found')],
  ['get, removed round: create, remove, get -> not_found', async () => { await d.createRoundTableStatus(ROUND); await d.removeRoundTableStatus({ roundId: 'r1' }); await refused(() => round(), 'not_found'); }],
  ['get, order: tables [3, 1, 2] -> [1, 2, 3]', async () => { await d.createRoundTableStatus({ roundId: 'r1', tables: [{ tableNumber: 3 }, { tableNumber: 1 }, { tableNumber: 2 }] }); assert.deepEqual((await round()).tables.map((t) => t.tableNumber), [1, 2, 3]); }],
  ...EVENTS.map((ev): Case => [`${ev}, unknown round: nope -> not_found`, async () => { await d.createRoundTableStatus(ROUND); await refused(() => EVENT[ev]({ roundId: 'nope', tableNumber: 1, bookingId: 'b1' }), 'not_found'); }]),
  ...EVENTS.flatMap((ev) => [42, 0, -1].map((n): Case => [`${ev}, unknown table: table ${n} of r1 -> not_found`, async () => { await d.createRoundTableStatus(ROUND); await refused(() => EVENT[ev](ref(n)), 'not_found'); }])),
  ['remove, unknown round: nope -> { removed: false }', async () => assert.deepEqual(await d.removeRoundTableStatus({ roundId: 'nope' }), { removed: false })],
  ['remove, twice: r1 removed again -> { removed: false }', async () => { await d.createRoundTableStatus(ROUND); await d.removeRoundTableStatus({ roundId: 'r1' }); assert.deepEqual(await d.removeRoundTableStatus({ roundId: 'r1' }), { removed: false }); }],
  ['remove, freed again: 1 held then released -> { removed: true }', async () => { await d.createRoundTableStatus(ROUND); await d.holdTable(ref(1)); await d.releaseHold(ref(1)); assert.deepEqual(await d.removeRoundTableStatus({ roundId: 'r1' }), { removed: true }); }],
  ['remove, OCCUPIED table: 1 occupied -> conflict, the document stays', async () => { await reach('OCCUPIED'); await refused(() => d.removeRoundTableStatus({ roundId: 'r1' }), 'conflict'); assert.equal(await statusOf(1), 'OCCUPIED'); }],
  ['remove, only NOT_FOR_SALE: tables [{3, false}] -> { removed: true }', async () => { await d.createRoundTableStatus(one(3, false)); assert.deepEqual(await d.removeRoundTableStatus({ roundId: 'r1' }), { removed: true }); }],
  ['remove, other round busy: r2 held, remove r1 -> { removed: true }', async () => { await d.createRoundTableStatus(ROUND); await d.createRoundTableStatus(R2); await d.holdTable({ roundId: 'r2', tableNumber: 7, bookingId: 'b9' }); assert.deepEqual(await d.removeRoundTableStatus({ roundId: 'r1' }), { removed: true }); assert.equal((await round('r2')).tables[0].status, 'HELD'); }],
];
describe('equivalence classes: createRoundTableStatus and the lookups', () => {
  for (const [name, run] of CLASSES) test(name, run);
});

// countAvailableTables (UC-01 step 3, AF-2): the classes of the id list and of the tables counted. r1 is ROUND
// (1 and 2 for sale, 3 not), r2 is R2 (table 7 for sale). "a of b" = available of forSale.
//
//   class                     | input                                  | expected
//   --------------------------+----------------------------------------+-------------------------------------------
//   no ids                    | roundIds []                            | counts []
//   roundIds missing          | {}                                     | counts []
//   one known id              | [r1]                                   | [r1: 2 of 2]
//   several ids, given order  | [r2, r1]                               | [r2: 1 of 1, r1: 2 of 2], in that order
//   same id twice             | [r1, r1]                               | answered twice
//   unknown among known       | [r1, nope, r2]                         | nope: 0 of 0, in its place
//   unknown only              | [nope]                                 | [nope: 0 of 0]
//   removed round             | r1 removed, [r1]                       | [r1: 0 of 0]: as unknown
//   all tables held           | 1 and 2 HELD                           | r1: 0 of 2
//   held, booked, occupied    | 1 OCCUPIED, 2 HELD                     | r1: 0 of 2 (taken, still for sale)
//   freed again               | 1 held then released                   | r1: 2 of 2
//   all tables not for sale   | r2 with every table forSale false      | r2: 0 of 0
const COUNTS: Case[] = [
  ['no ids: [] -> counts []', async () => { await d.createRoundTableStatus(ROUND); assert.deepEqual(await count([]), []); }],
  ['roundIds missing: {} -> counts []', async () => assert.deepEqual((await d.countAvailableTables({} as Parameters<typeof d.countAvailableTables>[0])).counts, [])],
  ['one known id: [r1] -> [r1: 2 of 2]', async () => { await d.createRoundTableStatus(ROUND); assert.deepEqual(await count(['r1']), [{ roundId: 'r1', available: 2, forSale: 2 }]); }],
  ['several ids, given order: [r2, r1] -> [r2: 1 of 1, r1: 2 of 2]', async () => { await d.createRoundTableStatus(ROUND); await d.createRoundTableStatus(R2); assert.deepEqual(await count(['r2', 'r1']), [{ roundId: 'r2', available: 1, forSale: 1 }, { roundId: 'r1', available: 2, forSale: 2 }]); }],
  ['same id twice: [r1, r1] -> answered twice', async () => { await d.createRoundTableStatus(ROUND); assert.deepEqual(await count(['r1', 'r1']), [{ roundId: 'r1', available: 2, forSale: 2 }, { roundId: 'r1', available: 2, forSale: 2 }]); }],
  ['unknown among known: [r1, nope, r2] -> nope: 0 of 0, in its place', async () => { await d.createRoundTableStatus(ROUND); await d.createRoundTableStatus(R2); assert.deepEqual(await count(['r1', 'nope', 'r2']), [{ roundId: 'r1', available: 2, forSale: 2 }, { roundId: 'nope', available: 0, forSale: 0 }, { roundId: 'r2', available: 1, forSale: 1 }]); }],
  ['unknown only: [nope] -> [nope: 0 of 0]', async () => assert.deepEqual(await count(['nope']), [{ roundId: 'nope', available: 0, forSale: 0 }])],
  ['removed round: r1 removed, [r1] -> [r1: 0 of 0]', async () => { await d.createRoundTableStatus(ROUND); await d.removeRoundTableStatus({ roundId: 'r1' }); assert.deepEqual(await count(['r1']), [{ roundId: 'r1', available: 0, forSale: 0 }]); }],
  ['all tables held: 1 and 2 HELD -> r1: 0 of 2', async () => { await d.createRoundTableStatus(ROUND); await d.holdTable(ref(1)); await d.holdTable(ref(2, 'b2')); assert.deepEqual(await count(['r1']), [{ roundId: 'r1', available: 0, forSale: 2 }]); }],
  ['held, booked, occupied: 1 OCCUPIED, 2 HELD -> r1: 0 of 2', async () => { await reach('OCCUPIED'); await d.holdTable(ref(2, 'b2')); assert.deepEqual(await count(['r1']), [{ roundId: 'r1', available: 0, forSale: 2 }]); }],
  ['freed again: 1 held then released -> r1: 2 of 2', async () => { await d.createRoundTableStatus(ROUND); await d.holdTable(ref(1)); await d.releaseHold(ref(1)); assert.deepEqual(await count(['r1']), [{ roundId: 'r1', available: 2, forSale: 2 }]); }],
  ['all tables not for sale: r2 every table forSale false -> r2: 0 of 0', async () => { await d.createRoundTableStatus({ roundId: 'r2', tables: [{ tableNumber: 1, forSale: false }, { tableNumber: 2, forSale: false }] }); assert.deepEqual(await count(['r2']), [{ roundId: 'r2', available: 0, forSale: 0 }]); }],
];
describe('equivalence classes: countAvailableTables', () => {
  for (const [name, run] of COUNTS) test(name, run);
});

// The version of the polled read (ADR-09): the ETag the web apps compare. Table 1 of r1 is driven to `state` first;
// the expected column is the change of r1's version after the action.
//
//   class            | input                                              | expected
//   -----------------+----------------------------------------------------+-----------
//   read             | getRoundTableStatus twice                          | unchanged
//   read             | countAvailableTables                               | unchanged
//   duplicate create | createRoundTableStatus r1 again                    | unchanged
//   transition       | holdTable of AVAILABLE                             | +1
//   transition       | releaseHold of HELD                                | +1
//   transition       | markTableBooked of HELD                            | +1
//   transition       | markTableOccupied of BOOKED                        | +1
//   no-op            | releaseHold of AVAILABLE                           | unchanged
//   refused          | holdTable of HELD by b2                            | unchanged
//   refused          | releaseHold of HELD with the wrong id              | unchanged
//   refused          | markTableBooked of AVAILABLE                       | unchanged
//   refused          | markTableOccupied of HELD                          | unchanged
//   refused          | holdTable of NOT_FOR_SALE                          | unchanged
//   refused          | holdTable of an unknown table                      | unchanged
//   refused          | holdTable without a booking id                     | unchanged
//   refused          | removeRoundTableStatus with a HELD table           | unchanged
//   other round      | a hold in r2                                       | unchanged
type VersionRow = [name: string, state: d.TableStatusValue, act: (tableNumber: number) => Promise<unknown>, refusedAs: d.DomainError['kind'] | null, delta: 0 | 1];
const VERSIONS: VersionRow[] = [
  ['read: getRoundTableStatus twice -> unchanged',                         'AVAILABLE',    async () => { await round(); await round(); }, null, 0],
  ['read: countAvailableTables -> unchanged',                              'HELD',         () => count(['r1']), null, 0],
  ['duplicate create: createRoundTableStatus r1 again -> unchanged',       'HELD',         () => d.createRoundTableStatus(one(9)), null, 0],
  ['transition: holdTable of AVAILABLE -> +1',                             'AVAILABLE',    (n) => d.holdTable(ref(n)), null, 1],
  ['transition: releaseHold of HELD -> +1',                                'HELD',         (n) => d.releaseHold(ref(n)), null, 1],
  ['transition: markTableBooked of HELD -> +1',                            'HELD',         (n) => d.markTableBooked(ref(n)), null, 1],
  ['transition: markTableOccupied of BOOKED -> +1',                        'BOOKED',       (n) => d.markTableOccupied(ref(n)), null, 1],
  ['no-op: releaseHold of AVAILABLE -> unchanged',                         'AVAILABLE',    (n) => d.releaseHold(ref(n)), null, 0],
  ['refused: holdTable of HELD by b2 -> unchanged',                        'HELD',         (n) => d.holdTable(ref(n, 'b2')), 'conflict', 0],
  ['refused: releaseHold of HELD with the wrong id -> unchanged',          'HELD',         (n) => d.releaseHold(ref(n, 'b2')), 'conflict', 0],
  ['refused: markTableBooked of AVAILABLE -> unchanged',                   'AVAILABLE',    (n) => d.markTableBooked(ref(n)), 'conflict', 0],
  ['refused: markTableOccupied of HELD -> unchanged',                      'HELD',         (n) => d.markTableOccupied(ref(n)), 'conflict', 0],
  ['refused: holdTable of NOT_FOR_SALE -> unchanged',                      'NOT_FOR_SALE', (n) => d.holdTable(ref(n)), 'conflict', 0],
  ['refused: holdTable of an unknown table -> unchanged',                  'AVAILABLE',    () => d.holdTable(ref(42)), 'not_found', 0],
  ['refused: holdTable without a booking id -> unchanged',                 'AVAILABLE',    (n) => d.holdTable(ref(n, '')), 'invalid', 0],
  ['refused: removeRoundTableStatus with a HELD table -> unchanged',       'HELD',         () => d.removeRoundTableStatus({ roundId: 'r1' }), 'conflict', 0],
  ['other round: a hold in r2 -> unchanged',                               'AVAILABLE',    async () => { await d.createRoundTableStatus(R2); await d.holdTable({ roundId: 'r2', tableNumber: 7, bookingId: 'b9' }); }, null, 0],
];
describe('version of the polled read (ADR-09)', () => {
  for (const [name, state, act, refusedAs, delta] of VERSIONS) test(name, async () => {
    const tableNumber = await reach(state);
    const before = await version();
    if (refusedAs) await refused(() => act(tableNumber), refusedAs); else await act(tableNumber);
    assert.equal(await version(), before + delta);
  });
});
