// Unit tests of the Staff Account Service domain: sign-in sessions and the accounts of the back-office (ADR-07).
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain.js';
import { resetStore } from '../src/store.js';

const refused = (fn: () => unknown, status: number) => assert.throws(fn, (e: unknown) => e instanceof d.DomainError && e.status === status);
const byName = (username: string) => d.listStaffAccounts().find((a) => a.username === username);

beforeEach(() => { resetStore(); d.seedStaffAccounts(); });

describe('seedStaffAccounts', () => {
  test('seeds the three accounts of progress 1 once', () => {
    d.seedStaffAccounts();
    assert.deepEqual(d.listStaffAccounts().map((a) => [a.username, a.role, a.status]), [['door1', 'front_staff', 'Active'], ['manager', 'manager', 'Active'], ['owner', 'owner', 'Active']]);
  });
});

describe('signIn and signOut', () => {
  test('a right password gives a session with the role; sign-out ends it', () => {
    const s = d.signIn({ username: 'manager', password: 'manager' });
    assert.deepEqual([s.role, s.staffAccountId], ['manager', byName('manager')?.staffAccountId]);
    assert.equal(d.getSession(s.token)?.role, 'manager');
    assert.deepEqual(d.signOut({ token: s.token }), {});
    assert.equal(d.getSession(s.token), null);
    assert.deepEqual(d.signOut({ token: s.token }), {});                                         // idempotent
    assert.notEqual(d.signIn({ username: 'door1', password: 'door1' }).token, d.signIn({ username: 'door1', password: 'door1' }).token);
  });
  test('a wrong password, an unknown user and a Disabled account are refused', () => {
    refused(() => d.signIn({ username: 'manager', password: 'nope' }), 401);
    refused(() => d.signIn({ username: 'nobody', password: 'nobody' }), 401);
    refused(() => d.signIn({ username: 'manager' }), 401);
    const s = d.signIn({ username: 'door1', password: 'door1' });
    d.disableStaffAccount({ staffAccountId: byName('door1')?.staffAccountId });
    refused(() => d.signIn({ username: 'door1', password: 'door1' }), 401);
    assert.equal(d.getSession(s.token), null);                                                  // its sessions ended
  });
});

describe('createStaffAccount, updateStaffAccount, disableStaffAccount', () => {
  test('creates an Active account, refuses a bad role, a short password and a taken username', () => {
    const a = d.createStaffAccount({ username: 'door2', role: 'front_staff', password: 'door2pw' });
    assert.deepEqual([a.username, a.role, a.status], ['door2', 'front_staff', 'Active']);
    assert.equal(d.signIn({ username: 'door2', password: 'door2pw' }).staffAccountId, a.staffAccountId);
    refused(() => d.createStaffAccount({ username: 'x', role: 'admin', password: 'xxxx' }), 400);
    refused(() => d.createStaffAccount({ username: 'x', role: 'owner', password: 'x' }), 400);
    refused(() => d.createStaffAccount({ username: '', role: 'owner', password: 'xxxx' }), 400);
    refused(() => d.createStaffAccount({ username: 'door2', role: 'owner', password: 'xxxx' }), 409);
  });
  test('updates the role and the password; a field left out is unchanged', () => {
    const id = byName('door1')?.staffAccountId;
    const s = d.signIn({ username: 'door1', password: 'door1' });
    assert.equal(d.updateStaffAccount({ staffAccountId: id, role: 'manager' }).role, 'manager');
    assert.equal(d.getSession(s.token)?.role, 'manager');
    d.updateStaffAccount({ staffAccountId: id, password: 'new-secret' });
    refused(() => d.signIn({ username: 'door1', password: 'door1' }), 401);
    assert.equal(d.signIn({ username: 'door1', password: 'new-secret' }).role, 'manager');
    refused(() => d.updateStaffAccount({ staffAccountId: id, role: 'boss' }), 400);
    refused(() => d.updateStaffAccount({ staffAccountId: 'nope', role: 'owner' }), 404);
  });
  test('disables an account (idempotent) and lists it as Disabled', () => {
    const id = byName('owner')?.staffAccountId;
    assert.equal(d.disableStaffAccount({ staffAccountId: id }).status, 'Disabled');
    assert.equal(d.disableStaffAccount({ staffAccountId: id }).status, 'Disabled');
    assert.equal(byName('owner')?.status, 'Disabled');
    refused(() => d.disableStaffAccount({ staffAccountId: 'nope' }), 404);
  });
});
