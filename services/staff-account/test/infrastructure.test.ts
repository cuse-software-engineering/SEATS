// Unit tests of the infrastructure of the Staff Account Service: the ports before and after wire(), and the words the
// repositories use when the store refuses (the store's DuplicateKeyError reaches the domain as a conflict).
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DomainError } from '@seats/errors/src/index.js';
import type { StaffAccount } from '../src/domain/index.js';
import { ports } from '../src/domain/ports.js';
import { accounts } from '../src/infrastructure/repositories.js';
import { resetStore, wire } from '../src/infrastructure/index.js';

describe('ports', () => {
  // class   | input                         | expected
  // unbound | ports.accounts before wire()  | throws, naming wire()
  // bound   | ports.accounts after wire()   | the repository of repositories.ts
  test('unbound: ports.accounts before wire() -> throws naming wire()', () => { assert.throws(() => ports.accounts, /port accounts is not bound: call wire\(\)/); });
  test('bound: ports.accounts after wire() -> the accounts repository', () => { wire(); assert.equal(ports.accounts, accounts); });
});

describe('accounts repository', () => {
  // class        | input                               | expected
  // insert twice | the same staffAccountId, twice      | DomainError conflict; the first account stays
  beforeEach(async () => { wire(); await resetStore(); });
  test('insert twice: the same staffAccountId -> conflict, the first stays', async () => {
    const a: StaffAccount = { staffAccountId: 'id-1', username: 'first', role: 'owner', status: 'Active', passwordSalt: 'salt', passwordHash: 'hash', createdAt: new Date(0).toISOString() };
    assert.deepEqual(await accounts.insert(a), a);
    await assert.rejects(() => accounts.insert({ ...a, username: 'second' }), (e: unknown) => e instanceof DomainError && e.kind === 'conflict');
    assert.equal((await accounts.get('id-1'))?.username, 'first');
  });
});
