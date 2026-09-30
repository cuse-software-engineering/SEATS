// Unit tests of the Table Availability Service domain (no collaborators): the read model of the table map (ADR-13).
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain.js';
import { resetStore } from '../src/store.js';

const ROUND = { roundId: 'r1', tables: [{ tableNumber: 1 }, { tableNumber: 2, forSale: true }, { tableNumber: 3, forSale: false }] };
const ref = (tableNumber: number, bookingId = 'b1') => ({ roundId: 'r1', tableNumber, bookingId });
const refused = (fn: () => unknown, status: number) => assert.throws(fn, (e: unknown) => e instanceof d.DomainError && e.status === status);
const statusOf = (tableNumber: number) => d.getRoundTableStatus({ roundId: 'r1' }).tables.find((t) => t.tableNumber === tableNumber)?.status;

beforeEach(resetStore);

describe('createRoundTableStatus', () => {
  test('creates the document with AVAILABLE and NOT_FOR_SALE tables', () => {
    const r = d.createRoundTableStatus(ROUND);
    assert.equal(r.roundId, 'r1');
    assert.equal(r.version, 1);
    assert.deepEqual(r.tables.map((t) => [t.tableNumber, t.status]), [[1, 'AVAILABLE'], [2, 'AVAILABLE'], [3, 'NOT_FOR_SALE']]);
  });
  test('is idempotent: a second call keeps the existing document', () => {
    d.createRoundTableStatus(ROUND);
    d.holdTable(ref(1));
    const again = d.createRoundTableStatus({ roundId: 'r1', tables: [{ tableNumber: 9 }] });
    assert.equal(again.version, 2);
    assert.equal(again.tables.length, 3);
    assert.equal(statusOf(1), 'HELD');
  });
  test('refuses an empty request', () => {
    refused(() => d.createRoundTableStatus({ roundId: '', tables: [{ tableNumber: 1 }] }), 400);
    refused(() => d.createRoundTableStatus({ roundId: 'r1', tables: [] }), 400);
  });
});

describe('holdTable', () => {
  beforeEach(() => d.createRoundTableStatus(ROUND));
  test('AVAILABLE -> HELD with the booking and the hold end', () => {
    const t = d.holdTable({ ...ref(1), holdEndsAt: '2026-10-01T10:15:00.000Z' });
    assert.deepEqual(t, { tableNumber: 1, status: 'HELD', bookingId: 'b1', holdEndsAt: '2026-10-01T10:15:00.000Z' });
  });
  test('a second hold on the same table by another booking is refused', () => {
    d.holdTable(ref(1));
    refused(() => d.holdTable(ref(1, 'b2')), 409);
    assert.equal(d.getRoundTableStatus({ roundId: 'r1' }).tables[0].bookingId, 'b1');
  });
  test('needs a booking id, a known round and a known table; a table not for sale cannot be held', () => {
    refused(() => d.holdTable({ roundId: 'r1', tableNumber: 1, bookingId: '' }), 400);
    refused(() => d.holdTable({ ...ref(1), roundId: 'nope' }), 404);
    refused(() => d.holdTable(ref(42)), 404);
    refused(() => d.holdTable(ref(3)), 409);
  });
});

describe('releaseHold', () => {
  beforeEach(() => d.createRoundTableStatus(ROUND));
  test('HELD -> AVAILABLE and the booking is cleared', () => {
    d.holdTable(ref(1));
    const t = d.releaseHold(ref(1));
    assert.deepEqual(t, { tableNumber: 1, status: 'AVAILABLE', bookingId: '', holdEndsAt: '' });
  });
  test('is a no-op on an AVAILABLE table (the expiry job may retry)', () => {
    const before = d.getRoundTableStatus({ roundId: 'r1' }).version;
    assert.equal(d.releaseHold(ref(2)).status, 'AVAILABLE');
    assert.equal(d.getRoundTableStatus({ roundId: 'r1' }).version, before);
  });
  test('is refused with another booking id', () => {
    d.holdTable(ref(1));
    refused(() => d.releaseHold(ref(1, 'b2')), 409);
    assert.equal(statusOf(1), 'HELD');
  });
});

describe('markTableBooked and markTableOccupied', () => {
  beforeEach(() => d.createRoundTableStatus(ROUND));
  test('HELD -> BOOKED -> OCCUPIED', () => {
    d.holdTable({ ...ref(1), holdEndsAt: '2026-10-01T10:15:00.000Z' });
    const booked = d.markTableBooked(ref(1));
    assert.equal(booked.status, 'BOOKED');
    assert.equal(booked.holdEndsAt, '');
    assert.equal(booked.bookingId, 'b1');
    assert.equal(d.markTableOccupied(ref(1)).status, 'OCCUPIED');
  });
  test('wrong-state transitions are refused', () => {
    refused(() => d.markTableBooked(ref(1)), 409);        // AVAILABLE, not HELD
    refused(() => d.markTableOccupied(ref(1)), 409);      // AVAILABLE, not BOOKED
    d.holdTable(ref(1));
    refused(() => d.markTableOccupied(ref(1)), 409);      // HELD, not BOOKED
    refused(() => d.markTableBooked(ref(1, 'b2')), 409);  // another booking
    d.markTableBooked(ref(1));
    refused(() => d.releaseHold(ref(1)), 409);            // BOOKED is not released
    refused(() => d.holdTable(ref(1, 'b2')), 409);
  });
});

describe('countAvailableTables', () => {
  test('counts the available and the for-sale tables per round; unknown rounds give zeros', () => {
    d.createRoundTableStatus(ROUND);
    d.holdTable(ref(1));
    assert.deepEqual(d.countAvailableTables({ roundIds: ['r1', 'unknown'] }).counts, [
      { roundId: 'r1', available: 1, forSale: 2 },
      { roundId: 'unknown', available: 0, forSale: 0 },
    ]);
  });
});

describe('removeRoundTableStatus', () => {
  beforeEach(() => d.createRoundTableStatus(ROUND));
  test('is refused while a table is held or booked', () => {
    d.holdTable(ref(1));
    refused(() => d.removeRoundTableStatus({ roundId: 'r1' }), 409);
    d.markTableBooked(ref(1));
    refused(() => d.removeRoundTableStatus({ roundId: 'r1' }), 409);
  });
  test('removes the document otherwise; an unknown round is not removed', () => {
    assert.deepEqual(d.removeRoundTableStatus({ roundId: 'r1' }), { removed: true });
    refused(() => d.getRoundTableStatus({ roundId: 'r1' }), 404);
    assert.deepEqual(d.removeRoundTableStatus({ roundId: 'r1' }), { removed: false });
  });
});

describe('version', () => {
  test('grows on every change and not on a read or a no-op', () => {
    d.createRoundTableStatus(ROUND);
    const v = () => d.getRoundTableStatus({ roundId: 'r1' }).version;
    assert.equal(v(), 1);
    d.holdTable(ref(1)); assert.equal(v(), 2);
    d.markTableBooked(ref(1)); assert.equal(v(), 3);
    d.markTableOccupied(ref(1)); assert.equal(v(), 4);
    d.holdTable(ref(2)); assert.equal(v(), 5);
    d.releaseHold(ref(2)); assert.equal(v(), 6);
    d.releaseHold(ref(2)); assert.equal(v(), 6);
    d.countAvailableTables({ roundIds: ['r1'] }); assert.equal(v(), 6);
  });
});
