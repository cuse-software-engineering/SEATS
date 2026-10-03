// Unit tests of the Staff Account Service domain: sign-in sessions and the accounts of the back-office (ADR-07).
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain.js';
import { resetStore } from '../src/store.js';

const refused = (fn: () => Promise<unknown>, status: number) => assert.rejects(fn, (e: unknown) => e instanceof d.DomainError && e.status === status);
const byName = async (username: string) => (await d.listStaffAccounts()).find((a) => a.username === username);

beforeEach(async () => { await resetStore(); await d.seedStaffAccounts(); });

describe('seedStaffAccounts', () => {
  test('seeds the three accounts of progress 1 once', async () => {
    const before = await d.listStaffAccounts();
    await d.seedStaffAccounts();
    assert.deepEqual((await d.listStaffAccounts()).map((a) => [a.username, a.role, a.status]), [['door1', 'front_staff', 'Active'], ['manager', 'manager', 'Active'], ['owner', 'owner', 'Active']]);
    assert.deepEqual(await d.listStaffAccounts(), before);                                     // the second seed keeps the ids: nothing overwritten
  });
  test('keeps an account the database already holds, with its changes', async () => {
    const id = (await byName('door1'))?.staffAccountId;
    await d.updateStaffAccount({ staffAccountId: id, role: 'manager', password: 'changed' });
    await d.seedStaffAccounts();
    assert.deepEqual([(await byName('door1'))?.staffAccountId, (await byName('door1'))?.role], [id, 'manager']);
    assert.equal((await d.signIn({ username: 'door1', password: 'changed' })).role, 'manager');
    await refused(() => d.signIn({ username: 'door1', password: 'door1' }), 401);
  });
});

describe('signIn and signOut', () => {
  test('a right password gives a session with the role; sign-out ends it', async () => {
    const s = await d.signIn({ username: 'manager', password: 'manager' });
    assert.deepEqual([s.role, s.staffAccountId], ['manager', (await byName('manager'))?.staffAccountId]);
    assert.equal((await d.getSession(s.token))?.role, 'manager');
    assert.deepEqual(await d.signOut({ token: s.token }), {});
    assert.equal(await d.getSession(s.token), null);
    assert.deepEqual(await d.signOut({ token: s.token }), {});                                   // idempotent
    assert.notEqual((await d.signIn({ username: 'door1', password: 'door1' })).token, (await d.signIn({ username: 'door1', password: 'door1' })).token);
  });
  test('a wrong password, an unknown user, a missing username and a Disabled account are refused', async () => {
    await refused(() => d.signIn({ username: 'manager', password: 'nope' }), 401);
    await refused(() => d.signIn({ username: 'nobody', password: 'nobody' }), 401);
    await refused(() => d.signIn({ username: 'manager' }), 401);
    await refused(() => d.signIn({ password: 'manager' }), 401);                                 // no username matches no account, not every account
    await refused(() => d.signIn({ username: '', password: 'manager' }), 401);
    const s = await d.signIn({ username: 'door1', password: 'door1' });
    await d.disableStaffAccount({ staffAccountId: (await byName('door1'))?.staffAccountId });
    await refused(() => d.signIn({ username: 'door1', password: 'door1' }), 401);
    assert.equal(await d.getSession(s.token), null);                                            // its sessions ended
  });
});

describe('createStaffAccount, updateStaffAccount, disableStaffAccount', () => {
  test('creates an Active account, refuses a bad role, a short password and a taken username', async () => {
    const a = await d.createStaffAccount({ username: 'door2', role: 'front_staff', password: 'door2pw' });
    assert.deepEqual([a.username, a.role, a.status], ['door2', 'front_staff', 'Active']);
    assert.equal((await d.signIn({ username: 'door2', password: 'door2pw' })).staffAccountId, a.staffAccountId);
    await refused(() => d.createStaffAccount({ username: 'x', role: 'admin', password: 'xxxx' }), 400);
    await refused(() => d.createStaffAccount({ username: 'x', role: 'owner', password: 'x' }), 400);
    await refused(() => d.createStaffAccount({ username: '', role: 'owner', password: 'xxxx' }), 400);
    await refused(() => d.createStaffAccount({ username: 'door2', role: 'owner', password: 'xxxx' }), 409);
  });
  test('updates the role and the password; a field left out is unchanged', async () => {
    const id = (await byName('door1'))?.staffAccountId;
    const s = await d.signIn({ username: 'door1', password: 'door1' });
    assert.equal((await d.updateStaffAccount({ staffAccountId: id, role: 'manager' })).role, 'manager');
    assert.equal((await d.getSession(s.token))?.role, 'manager');
    assert.equal((await byName('door1'))?.role, 'manager');                                     // the change reached the store, not only the copy
    await d.updateStaffAccount({ staffAccountId: id, password: 'new-secret' });
    await refused(() => d.signIn({ username: 'door1', password: 'door1' }), 401);
    assert.equal((await d.signIn({ username: 'door1', password: 'new-secret' })).role, 'manager');
    await refused(() => d.updateStaffAccount({ staffAccountId: id, role: 'boss' }), 400);
    await refused(() => d.updateStaffAccount({ staffAccountId: 'nope', role: 'owner' }), 404);
  });
  test('disables an account (idempotent) and lists it as Disabled', async () => {
    const id = (await byName('owner'))?.staffAccountId;
    assert.equal((await d.disableStaffAccount({ staffAccountId: id })).status, 'Disabled');
    assert.equal((await d.disableStaffAccount({ staffAccountId: id })).status, 'Disabled');
    assert.equal((await byName('owner'))?.status, 'Disabled');
    await refused(() => d.disableStaffAccount({ staffAccountId: 'nope' }), 404);
  });
});
