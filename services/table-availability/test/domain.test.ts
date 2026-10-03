// Unit tests of the Table Availability Service domain (no collaborators): the read model of the table map (ADR-13).
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
