// Unit tests of the Staff Account Service domain: sign-in sessions and the accounts of the back-office (ADR-07).
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { DomainErrorKind } from '@seats/errors/src/index.js';
import * as d from '../src/domain/index.js';
import type { StaffAccountStatus, StaffAccountView, StaffRole } from '../src/domain/index.js';
import { resetStore, wire } from '../src/infrastructure/index.js';

wire();   // binds the repositories over the (in-memory) store to the domain's ports, once per test module

const refused = (fn: () => Promise<unknown>, kind: DomainErrorKind) => assert.rejects(fn, (e: unknown) => e instanceof d.DomainError && e.kind === kind);
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
    await refused(() => d.signIn({ username: 'door1', password: 'door1' }), 'unauthenticated');
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
    await refused(() => d.signIn({ username: 'manager', password: 'nope' }), 'unauthenticated');
    await refused(() => d.signIn({ username: 'nobody', password: 'nobody' }), 'unauthenticated');
    await refused(() => d.signIn({ username: 'manager' }), 'unauthenticated');
    await refused(() => d.signIn({ password: 'manager' }), 'unauthenticated');                                 // no username matches no account, not every account
    await refused(() => d.signIn({ username: '', password: 'manager' }), 'unauthenticated');
    const s = await d.signIn({ username: 'door1', password: 'door1' });
    await d.disableStaffAccount({ staffAccountId: (await byName('door1'))?.staffAccountId });
    await refused(() => d.signIn({ username: 'door1', password: 'door1' }), 'unauthenticated');
    assert.equal(await d.getSession(s.token), null);                                            // its sessions ended
  });
});

describe('createStaffAccount, updateStaffAccount, disableStaffAccount', () => {
  test('creates an Active account, refuses a bad role, a short password and a taken username', async () => {
    const a = await d.createStaffAccount({ username: 'door2', role: 'front_staff', password: 'door2pw' });
    assert.deepEqual([a.username, a.role, a.status], ['door2', 'front_staff', 'Active']);
    assert.equal((await d.signIn({ username: 'door2', password: 'door2pw' })).staffAccountId, a.staffAccountId);
    await refused(() => d.createStaffAccount({ username: 'x', role: 'admin', password: 'xxxx' }), 'invalid');
    await refused(() => d.createStaffAccount({ username: 'x', role: 'owner', password: 'x' }), 'invalid');
    await refused(() => d.createStaffAccount({ username: '', role: 'owner', password: 'xxxx' }), 'invalid');
    await refused(() => d.createStaffAccount({ username: 'door2', role: 'owner', password: 'xxxx' }), 'conflict');
  });
  test('updates the role and the password; a field left out is unchanged', async () => {
    const id = (await byName('door1'))?.staffAccountId;
    const s = await d.signIn({ username: 'door1', password: 'door1' });
    assert.equal((await d.updateStaffAccount({ staffAccountId: id, role: 'manager' })).role, 'manager');
    assert.equal((await d.getSession(s.token))?.role, 'manager');
    assert.equal((await byName('door1'))?.role, 'manager');                                     // the change reached the store, not only the copy
    await d.updateStaffAccount({ staffAccountId: id, password: 'new-secret' });
    await refused(() => d.signIn({ username: 'door1', password: 'door1' }), 'unauthenticated');
    assert.equal((await d.signIn({ username: 'door1', password: 'new-secret' })).role, 'manager');
    await refused(() => d.updateStaffAccount({ staffAccountId: id, role: 'boss' }), 'invalid');
    await refused(() => d.updateStaffAccount({ staffAccountId: 'nope', role: 'owner' }), 'not_found');
  });
  test('disables an account (idempotent) and lists it as Disabled', async () => {
    const id = (await byName('owner'))?.staffAccountId;
    assert.equal((await d.disableStaffAccount({ staffAccountId: id })).status, 'Disabled');
    assert.equal((await d.disableStaffAccount({ staffAccountId: id })).status, 'Disabled');
    assert.equal((await byName('owner'))?.status, 'Disabled');
    await refused(() => d.disableStaffAccount({ staffAccountId: 'nope' }), 'not_found');
  });
});

// ---------------------------------------------------------------- systematic cases, table-driven: the header comment of each describe is the table
// (class | input | expected), its rows array says the same as data, and one test per row reads "<class or cell>: <input> -> <expected>".
type Credentials = { username?: string; password?: string };
type Signed = Awaited<ReturnType<typeof d.signIn>>;
type Refused = { refused: DomainErrorKind };
const show = (v: unknown): string => JSON.stringify(v) ?? 'undefined';
const idOf = async (username: string) => (await byName(username))?.staffAccountId;
const signInDoor1 = () => d.signIn({ username: 'door1', password: 'door1' });
const VIEW_KEYS = ['role', 'staffAccountId', 'status', 'username'];   // a StaffAccountView: never passwordHash nor passwordSalt

describe('signIn classes', () => {
  // class                      | input                                     | expected
  // known user, right password | manager/manager, door1/door1, owner/owner | a session with the account's role and id, open for getSession
  // unknown user               | nobody/nobody                             | unauthenticated
  // right user, wrong password | manager/nope, manager/Manager             | unauthenticated (the password is case-sensitive)
  // empty username             | ''/manager                                | unauthenticated (an empty username matches no account, not every account)
  // whitespace username        | ' manager '/manager, '   '/manager        | unauthenticated (the username is not trimmed at sign-in)
  // empty password             | manager/''                                | unauthenticated
  // missing fields             | {username}, {password}, {}                | unauthenticated
  // disabled account           | door1/door1 once door1 is Disabled        | unauthenticated
  // the same user twice        | door1/door1 twice                         | two sessions with different tokens, both open
  // case of the username       | Manager/manager, MANAGER/manager          | unauthenticated (usernames are case-sensitive)
  type Row = { cls: string; input: Credentials; expected: { session: StaffRole; times?: number } | Refused; before?: () => Promise<void> };
  const rows: Row[] = [
    { cls: 'known user, right password', input: { username: 'manager', password: 'manager' }, expected: { session: 'manager' } },
    { cls: 'known user, right password', input: { username: 'door1', password: 'door1' }, expected: { session: 'front_staff' } },
    { cls: 'known user, right password', input: { username: 'owner', password: 'owner' }, expected: { session: 'owner' } },
    { cls: 'unknown user', input: { username: 'nobody', password: 'nobody' }, expected: { refused: 'unauthenticated' } },
    { cls: 'right user, wrong password', input: { username: 'manager', password: 'nope' }, expected: { refused: 'unauthenticated' } },
    { cls: 'right user, wrong password', input: { username: 'manager', password: 'Manager' }, expected: { refused: 'unauthenticated' } },
    { cls: 'empty username', input: { username: '', password: 'manager' }, expected: { refused: 'unauthenticated' } },
    { cls: 'whitespace username', input: { username: ' manager ', password: 'manager' }, expected: { refused: 'unauthenticated' } },
    { cls: 'whitespace username', input: { username: '   ', password: 'manager' }, expected: { refused: 'unauthenticated' } },
    { cls: 'empty password', input: { username: 'manager', password: '' }, expected: { refused: 'unauthenticated' } },
    { cls: 'missing fields', input: { username: 'manager' }, expected: { refused: 'unauthenticated' } },
    { cls: 'missing fields', input: { password: 'manager' }, expected: { refused: 'unauthenticated' } },
    { cls: 'missing fields', input: {}, expected: { refused: 'unauthenticated' } },
    { cls: 'disabled account', input: { username: 'door1', password: 'door1' }, expected: { refused: 'unauthenticated' }, before: async () => { await d.disableStaffAccount({ staffAccountId: await idOf('door1') }); } },
    { cls: 'the same user twice', input: { username: 'door1', password: 'door1' }, expected: { session: 'front_staff', times: 2 } },
    { cls: 'case of the username', input: { username: 'Manager', password: 'manager' }, expected: { refused: 'unauthenticated' } },
    { cls: 'case of the username', input: { username: 'MANAGER', password: 'manager' }, expected: { refused: 'unauthenticated' } },
  ];
  const text = (e: Row['expected']) => 'refused' in e ? e.refused : e.times ? `${e.times} sessions as ${e.session}, different tokens, both open` : `a session as ${e.session}`;
  for (const { cls, input, expected, before } of rows) {
    test(`${cls}: ${show(input)} -> ${text(expected)}`, async () => {
      await before?.();
      if ('refused' in expected) { await refused(() => d.signIn(input), expected.refused); return; }
      const id = await idOf(input.username ?? '');
      const sessions: Signed[] = [];
      for (let i = 0; i < (expected.times ?? 1); i++) sessions.push(await d.signIn(input));
      for (const s of sessions) assert.deepEqual([s.role, s.staffAccountId, (await d.getSession(s.token))?.role], [expected.session, id, expected.session]);
      assert.equal(new Set(sessions.map((s) => s.token)).size, sessions.length);                   // every sign-in is a session of its own
    });
  }
});

describe('createStaffAccount classes', () => {
  // class                         | input                                                    | expected
  // valid, each role              | door2 as manager / front_staff / owner, password door2pw | an Active view with the role, listed, and door2pw signs in
  // unknown role                  | role admin, '', missing                                  | invalid, nothing created
  // duplicate username            | door1 (seeded)                                           | conflict, nothing created
  // case of the username          | Door1 (door1 seeded)                                     | created as another account (usernames are case-sensitive)
  // surrounding spaces            | '  door2  '                                              | created as door2 (trimmed); door2 signs in
  // surrounding spaces, duplicate | '  door1  ' (door1 seeded)                               | conflict: the duplicate check is against the trimmed name (todo, see the row)
  // empty or short password       | '', abc, missing                                         | invalid (at least 4 characters), nothing created
  // shortest password             | abcd                                                     | created (the boundary: 4 characters)
  // empty username                | '', '   ', missing                                       | invalid, nothing created
  type Row = { cls: string; input: Parameters<typeof d.createStaffAccount>[0]; expected: { created: [username: string, role: StaffRole] } | Refused; todo?: string };
  const rows: Row[] = [
    { cls: 'valid, each role', input: { username: 'door2', role: 'manager', password: 'door2pw' }, expected: { created: ['door2', 'manager'] } },
    { cls: 'valid, each role', input: { username: 'door2', role: 'front_staff', password: 'door2pw' }, expected: { created: ['door2', 'front_staff'] } },
    { cls: 'valid, each role', input: { username: 'door2', role: 'owner', password: 'door2pw' }, expected: { created: ['door2', 'owner'] } },
    { cls: 'unknown role', input: { username: 'door2', role: 'admin', password: 'door2pw' }, expected: { refused: 'invalid' } },
    { cls: 'unknown role', input: { username: 'door2', role: '', password: 'door2pw' }, expected: { refused: 'invalid' } },
    { cls: 'unknown role', input: { username: 'door2', password: 'door2pw' }, expected: { refused: 'invalid' } },
    { cls: 'duplicate username', input: { username: 'door1', role: 'owner', password: 'door2pw' }, expected: { refused: 'conflict' } },
    { cls: 'case of the username', input: { username: 'Door1', role: 'owner', password: 'door2pw' }, expected: { created: ['Door1', 'owner'] } },
    { cls: 'surrounding spaces', input: { username: '  door2  ', role: 'front_staff', password: 'door2pw' }, expected: { created: ['door2', 'front_staff'] } },
    { cls: 'surrounding spaces, duplicate', input: { username: '  door1  ', role: 'front_staff', password: 'door2pw' }, expected: { refused: 'conflict' } },
    { cls: 'empty or short password', input: { username: 'door2', role: 'owner', password: '' }, expected: { refused: 'invalid' } },
    { cls: 'empty or short password', input: { username: 'door2', role: 'owner', password: 'abc' }, expected: { refused: 'invalid' } },
    { cls: 'empty or short password', input: { username: 'door2', role: 'owner' }, expected: { refused: 'invalid' } },
    { cls: 'shortest password', input: { username: 'door2', role: 'owner', password: 'abcd' }, expected: { created: ['door2', 'owner'] } },
    { cls: 'empty username', input: { username: '', role: 'owner', password: 'door2pw' }, expected: { refused: 'invalid' } },
    { cls: 'empty username', input: { username: '   ', role: 'owner', password: 'door2pw' }, expected: { refused: 'invalid' } },
    { cls: 'empty username', input: { role: 'owner', password: 'door2pw' }, expected: { refused: 'invalid' } },
  ];
  for (const { cls, input, expected, todo } of rows) {
    const name = `${cls}: ${show(input)} -> ${'refused' in expected ? `${expected.refused}, nothing created` : `created ${expected.created[0]} as ${expected.created[1]}`}`;
    const body = async () => {
      const before = await d.listStaffAccounts();
      if ('refused' in expected) { await refused(() => d.createStaffAccount(input), expected.refused); assert.deepEqual(await d.listStaffAccounts(), before); return; }
      const [username, role] = expected.created;
      const a = await d.createStaffAccount(input);
      assert.deepEqual(a, { staffAccountId: a.staffAccountId, username, role, status: 'Active' });
      assert.deepEqual(await d.listStaffAccounts(), [...before, a].sort((x, y) => x.username.localeCompare(y.username)));
      assert.equal((await d.signIn({ username, password: input.password })).staffAccountId, a.staffAccountId);
    };
    if (todo) test.todo(`${name}: ${todo}`, body); else test(name, body);
  }
});

describe('updateStaffAccount and disableStaffAccount classes (on door1)', () => {
  // class                   | input                                   | expected
  // no field                | update {id}                             | unchanged: front_staff, Active, door1 still signs in
  // unknown id              | update id nope, id missing              | not_found
  // unknown role            | update role boss, role ''               | invalid; unchanged
  // short password          | update password '', password abc        | invalid; unchanged
  // both fields             | update role owner + password both-new   | role owner; both-new signs in, door1 refused
  // one good field, one bad | update role owner + password x          | invalid; the role unchanged too (all or nothing)
  // disable, unknown id     | disable id nope, id missing             | not_found
  type Row = { cls: string; call: 'updateStaffAccount' | 'disableStaffAccount'; id: 'door1' | 'nope' | 'missing'; fields?: { role?: string; password?: string }; expected: { role: StaffRole; password: string } | Refused };
  const rows: Row[] = [
    { cls: 'no field', call: 'updateStaffAccount', id: 'door1', expected: { role: 'front_staff', password: 'door1' } },
    { cls: 'unknown id', call: 'updateStaffAccount', id: 'nope', fields: { role: 'owner' }, expected: { refused: 'not_found' } },
    { cls: 'unknown id', call: 'updateStaffAccount', id: 'missing', fields: { role: 'owner' }, expected: { refused: 'not_found' } },
    { cls: 'unknown role', call: 'updateStaffAccount', id: 'door1', fields: { role: 'boss' }, expected: { refused: 'invalid' } },
    { cls: 'unknown role', call: 'updateStaffAccount', id: 'door1', fields: { role: '' }, expected: { refused: 'invalid' } },
    { cls: 'short password', call: 'updateStaffAccount', id: 'door1', fields: { password: '' }, expected: { refused: 'invalid' } },
    { cls: 'short password', call: 'updateStaffAccount', id: 'door1', fields: { password: 'abc' }, expected: { refused: 'invalid' } },
    { cls: 'both fields', call: 'updateStaffAccount', id: 'door1', fields: { role: 'owner', password: 'both-new' }, expected: { role: 'owner', password: 'both-new' } },
    { cls: 'one good field, one bad', call: 'updateStaffAccount', id: 'door1', fields: { role: 'owner', password: 'x' }, expected: { refused: 'invalid' } },
    { cls: 'disable, unknown id', call: 'disableStaffAccount', id: 'nope', expected: { refused: 'not_found' } },
    { cls: 'disable, unknown id', call: 'disableStaffAccount', id: 'missing', expected: { refused: 'not_found' } },
  ];
  for (const { cls, call, id, fields = {}, expected } of rows) {
    test(`${cls}: ${call}(id ${id}, ${show(fields)}) -> ${'refused' in expected ? `${expected.refused}, unchanged` : `role ${expected.role}, ${expected.password} signs in`}`, async () => {
      const door1 = (await byName('door1'))!;
      const staffAccountId = id === 'door1' ? door1.staffAccountId : id === 'nope' ? 'nope' : undefined;
      const run = () => call === 'disableStaffAccount' ? d.disableStaffAccount({ staffAccountId }) : d.updateStaffAccount({ staffAccountId, ...fields });
      if ('refused' in expected) { await refused(run, expected.refused); assert.deepEqual(await byName('door1'), door1); assert.equal((await signInDoor1()).role, door1.role); return; }
      assert.deepEqual(await run(), { ...door1, role: expected.role });
      assert.equal((await d.signIn({ username: 'door1', password: expected.password })).role, expected.role);
      if (expected.password !== 'door1') await refused(signInDoor1, 'unauthenticated');
    });
  }
});

describe('state transitions of an account (door1 with two open sessions, t1 and t2)', () => {
  // state \ event | signIn            | updateStaffAccount role         | updateStaffAccount password                   | disableStaffAccount         | getSession (t1, t2)
  // Active        | a session; Active | role changed; Active; t1 and t2 | door1 refused, the new one signs in; Active;  | Disabled; t1 and t2 ended   | both open, with the id and the role
  //               |                   | carry the new role              | t1 and t2 stay open                           |                             |
  // Disabled      | unauthenticated   | role changed; stays Disabled;   | stays Disabled; neither the old nor the new   | Disabled again (idempotent, | null, null (ended when disabled)
  //               |                   | sign-in still refused           | password signs in                             | no conflict)                |
  type Fixture = { id: string; tokens: [string, string] };
  const arrange = async (state: StaffAccountStatus): Promise<Fixture> => {
    const id = (await idOf('door1'))!;
    const tokens: [string, string] = [(await signInDoor1()).token, (await signInDoor1()).token];
    if (state === 'Disabled') await d.disableStaffAccount({ staffAccountId: id });
    return { id, tokens };
  };
  const statusOf = async () => (await byName('door1'))?.status;
  const open = (tokens: string[]) => Promise.all(tokens.map((t) => d.getSession(t)));
  type Row = { state: StaffAccountStatus; event: string; input: string; expected: string; check: (f: Fixture) => Promise<void> };
  const rows: Row[] = [
    { state: 'Active', event: 'signIn', input: 'door1/door1', expected: 'a session; stays Active', check: async ({ id }) => { assert.equal((await signInDoor1()).staffAccountId, id); assert.equal(await statusOf(), 'Active'); } },
    { state: 'Active', event: 'updateStaffAccount role', input: 'role manager', expected: 'role manager, stays Active; t1 and t2 carry manager', check: async ({ id, tokens }) => { assert.deepEqual(await d.updateStaffAccount({ staffAccountId: id, role: 'manager' }), { staffAccountId: id, username: 'door1', role: 'manager', status: 'Active' }); assert.deepEqual((await open(tokens)).map((s) => s?.role), ['manager', 'manager']); } },
    { state: 'Active', event: 'updateStaffAccount password', input: 'password new-secret', expected: 'door1 refused, new-secret signs in, stays Active; t1 and t2 stay open', check: async ({ id, tokens }) => { assert.equal((await d.updateStaffAccount({ staffAccountId: id, password: 'new-secret' })).status, 'Active'); await refused(signInDoor1, 'unauthenticated'); assert.equal((await d.signIn({ username: 'door1', password: 'new-secret' })).staffAccountId, id); assert.deepEqual((await open(tokens)).map((s) => s?.token), tokens); } },
    { state: 'Active', event: 'disableStaffAccount', input: 'door1', expected: 'Disabled; t1 and t2 ended', check: async ({ id, tokens }) => { assert.equal((await d.disableStaffAccount({ staffAccountId: id })).status, 'Disabled'); assert.equal(await statusOf(), 'Disabled'); assert.deepEqual(await open(tokens), [null, null]); } },
    { state: 'Active', event: 'getSession', input: 't1, t2', expected: 'both open, with the id and role front_staff', check: async ({ id, tokens }) => { assert.deepEqual((await open(tokens)).map((s) => [s?.token, s?.staffAccountId, s?.role]), tokens.map((t) => [t, id, 'front_staff'])); } },
    { state: 'Disabled', event: 'signIn', input: 'door1/door1', expected: 'unauthenticated; stays Disabled', check: async () => { await refused(signInDoor1, 'unauthenticated'); assert.equal(await statusOf(), 'Disabled'); } },
    { state: 'Disabled', event: 'updateStaffAccount role', input: 'role manager', expected: 'role manager, stays Disabled; sign-in still refused', check: async ({ id }) => { assert.deepEqual(await d.updateStaffAccount({ staffAccountId: id, role: 'manager' }), { staffAccountId: id, username: 'door1', role: 'manager', status: 'Disabled' }); await refused(signInDoor1, 'unauthenticated'); } },
    { state: 'Disabled', event: 'updateStaffAccount password', input: 'password new-secret', expected: 'stays Disabled; neither door1 nor new-secret signs in', check: async ({ id }) => { assert.equal((await d.updateStaffAccount({ staffAccountId: id, password: 'new-secret' })).status, 'Disabled'); await refused(signInDoor1, 'unauthenticated'); await refused(() => d.signIn({ username: 'door1', password: 'new-secret' }), 'unauthenticated'); } },
    { state: 'Disabled', event: 'disableStaffAccount', input: 'door1 again', expected: 'Disabled (idempotent, no conflict)', check: async ({ id }) => { assert.equal((await d.disableStaffAccount({ staffAccountId: id })).status, 'Disabled'); assert.equal(await statusOf(), 'Disabled'); } },
    { state: 'Disabled', event: 'getSession', input: 't1, t2 (from before the disabling)', expected: 'null, null', check: async ({ tokens }) => { assert.deepEqual(await open(tokens), [null, null]); } },
  ];
  for (const { state, event, input, expected, check } of rows) test(`${state} x ${event}: ${input} -> ${expected}`, async () => check(await arrange(state)));
});

describe('getSession and signOut classes (manager signed in twice: s and other)', () => {
  // class                   | input                          | expected
  // valid token             | s.token                        | the session: token, staffAccountId, role manager, createdAt as an ISO date
  // unknown token           | 'nope', ''                     | null
  // token after signOut     | s.token once s is signed out   | null; other stays open
  // signOut twice           | s.token twice                  | {} both times (idempotent); s stays signed out
  // signOut unknown/missing | {token: 'nope'}, {}            | {} (already signed out); s and other stay open
  type Row = { cls: string; input: string; expected: string; check: (s: Signed, other: Signed) => Promise<void> };
  const openTokens = async (...ss: Signed[]) => (await Promise.all(ss.map((x) => d.getSession(x.token)))).map((x) => x?.token);
  const rows: Row[] = [
    { cls: 'valid token', input: 's.token', expected: 'the session with token, staffAccountId, role manager and an ISO createdAt', check: async (s) => { const open = await d.getSession(s.token); assert.ok(open); assert.deepEqual(open, { token: s.token, staffAccountId: s.staffAccountId, role: 'manager', createdAt: new Date(open.createdAt).toISOString() }); } },
    { cls: 'unknown token', input: "'nope'", expected: 'null', check: async () => { assert.equal(await d.getSession('nope'), null); } },
    { cls: 'unknown token', input: "''", expected: 'null', check: async () => { assert.equal(await d.getSession(''), null); } },
    { cls: 'token after signOut', input: 's.token once s is signed out', expected: 'null; other stays open', check: async (s, other) => { assert.deepEqual(await d.signOut({ token: s.token }), {}); assert.deepEqual(await openTokens(s, other), [undefined, other.token]); } },
    { cls: 'signOut twice', input: 's.token twice', expected: '{} both times; s stays signed out', check: async (s, other) => { assert.deepEqual([await d.signOut({ token: s.token }), await d.signOut({ token: s.token })], [{}, {}]); assert.deepEqual(await openTokens(s, other), [undefined, other.token]); } },
    { cls: 'signOut unknown token', input: "{token: 'nope'}", expected: '{}; s and other stay open', check: async (s, other) => { assert.deepEqual(await d.signOut({ token: 'nope' }), {}); assert.deepEqual(await openTokens(s, other), [s.token, other.token]); } },
    { cls: 'signOut missing token', input: '{}', expected: '{}; s and other stay open', check: async (s, other) => { assert.deepEqual(await d.signOut({}), {}); assert.deepEqual(await openTokens(s, other), [s.token, other.token]); } },
  ];
  for (const { cls, input, expected, check } of rows) test(`${cls}: ${input} -> ${expected}`, async () => check(await d.signIn({ username: 'manager', password: 'manager' }), await d.signIn({ username: 'manager', password: 'manager' })));
});

describe('listStaffAccounts classes', () => {
  // class                   | input                                       | expected
  // ordering                | seeded + zed (created first), alice         | alice, door1, manager, owner, zed (by username, not by creation)
  // ordering with digits    | seeded + door10, door2                      | door1, door10, door2, manager, owner (string order, not numeric)
  // includes disabled       | owner disabled                              | owner listed as Disabled, the others Active
  // no password             | seeded                                      | every view has exactly staffAccountId, username, role and status
  // no password, any answer | create, update, disable, signIn, getSession | no passwordHash nor passwordSalt in any answer
  // empty                   | the store reset                             | []
  type Row = { cls: string; input: string; expected: string; arrange?: () => Promise<void>; check: (list: StaffAccountView[]) => Promise<void> };
  const create = (username: string, role: StaffRole = 'owner') => d.createStaffAccount({ username, role, password: 'secret' });
  const rows: Row[] = [
    { cls: 'ordering', input: 'seeded + zed (created first), alice', expected: 'alice, door1, manager, owner, zed (by username, not by creation)', arrange: async () => { await create('zed'); await create('alice'); }, check: async (list) => { assert.deepEqual(list.map((a) => a.username), ['alice', 'door1', 'manager', 'owner', 'zed']); } },
    { cls: 'ordering with digits', input: 'seeded + door10, door2', expected: 'door1, door10, door2, manager, owner (string order, not numeric)', arrange: async () => { await create('door10'); await create('door2'); }, check: async (list) => { assert.deepEqual(list.map((a) => a.username), ['door1', 'door10', 'door2', 'manager', 'owner']); } },
    { cls: 'includes disabled', input: 'owner disabled', expected: 'owner listed as Disabled, the others Active', arrange: async () => { await d.disableStaffAccount({ staffAccountId: await idOf('owner') }); }, check: async (list) => { assert.deepEqual(list.map((a) => [a.username, a.status]), [['door1', 'Active'], ['manager', 'Active'], ['owner', 'Disabled']]); } },
    { cls: 'no password', input: 'seeded', expected: 'every view has exactly staffAccountId, username, role and status', check: async (list) => { assert.equal(list.length, 3); for (const a of list) assert.deepEqual(Object.keys(a).sort(), VIEW_KEYS); } },
    { cls: 'no password, any answer', input: 'create door2, signIn, getSession, update, disable', expected: 'no passwordHash nor passwordSalt in any answer', check: async () => {
      const keys = (x: object | null) => Object.keys(x ?? {}).sort();
      const a = await create('door2');
      const s = await d.signIn({ username: 'door2', password: 'secret' });
      assert.deepEqual([keys(s), keys(await d.getSession(s.token))], [['role', 'staffAccountId', 'token'], ['createdAt', 'role', 'staffAccountId', 'token']]);
      assert.deepEqual([keys(a), keys(await d.updateStaffAccount({ staffAccountId: a.staffAccountId, password: 'secret2' })), keys(await d.disableStaffAccount({ staffAccountId: a.staffAccountId }))], [VIEW_KEYS, VIEW_KEYS, VIEW_KEYS]);
    } },
    { cls: 'empty', input: 'the store reset', expected: '[]', arrange: () => resetStore(), check: async (list) => { assert.deepEqual(list, []); } },
  ];
  for (const { cls, input, expected, arrange, check } of rows) test(`${cls}: ${input} -> ${expected}`, async () => { await arrange?.(); await check(await d.listStaffAccounts()); });
});

describe('seedStaffAccounts idempotency classes', () => {
  // class         | input                                      | expected
  // ids kept      | seed again                                 | the same list: ids, roles, statuses
  // role kept     | door1 role -> manager, seed again          | door1 still manager, same id
  // password kept | door1 password -> changed, seed again      | changed signs in, door1 refused, same id
  // status kept   | owner disabled, seed again                 | owner still Disabled, owner/owner refused (a seed never re-enables)
  // partial       | store reset, door1 created as owner, seed  | door1 kept as owner with its password; manager and owner created with password = username
  // answer        | seed                                       | the three views in seed order: manager, door1, owner
  type Row = { cls: string; input: string; expected: string; arrange?: () => Promise<void>; check: (seeded: StaffAccountView[], before: StaffAccountView[]) => Promise<void> };
  const rows: Row[] = [
    { cls: 'ids kept', input: 'seed again', expected: 'the same list (ids, roles, statuses)', check: async (_seeded, before) => { assert.deepEqual(await d.listStaffAccounts(), before); } },
    { cls: 'role kept', input: 'door1 role -> manager, seed again', expected: 'door1 still manager, same id', arrange: async () => { await d.updateStaffAccount({ staffAccountId: await idOf('door1'), role: 'manager' }); }, check: async (seeded, before) => { assert.deepEqual(await d.listStaffAccounts(), before); assert.equal((await byName('door1'))?.role, 'manager'); assert.equal(seeded[1]?.role, 'manager'); } },
    { cls: 'password kept', input: 'door1 password -> changed, seed again', expected: 'changed signs in, door1 refused, same id', arrange: async () => { await d.updateStaffAccount({ staffAccountId: await idOf('door1'), password: 'changed' }); }, check: async (_seeded, before) => { assert.deepEqual(await d.listStaffAccounts(), before); assert.equal((await d.signIn({ username: 'door1', password: 'changed' })).role, 'front_staff'); await refused(signInDoor1, 'unauthenticated'); } },
    { cls: 'status kept', input: 'owner disabled, seed again', expected: 'owner still Disabled, owner/owner refused', arrange: async () => { await d.disableStaffAccount({ staffAccountId: await idOf('owner') }); }, check: async (seeded, before) => { assert.deepEqual(await d.listStaffAccounts(), before); assert.equal(seeded[2]?.status, 'Disabled'); await refused(() => d.signIn({ username: 'owner', password: 'owner' }), 'unauthenticated'); } },
    { cls: 'partial', input: 'store reset, door1 created as owner, seed', expected: 'door1 kept as owner with its password; manager and owner created with password = username', arrange: async () => { await resetStore(); await d.createStaffAccount({ username: 'door1', role: 'owner', password: 'other-pw' }); }, check: async (seeded, before) => {
      assert.deepEqual(seeded.map((a) => [a.username, a.role, a.status]), [['manager', 'manager', 'Active'], ['door1', 'owner', 'Active'], ['owner', 'owner', 'Active']]);
      assert.deepEqual([seeded[1], (await d.signIn({ username: 'door1', password: 'other-pw' })).role], [before[0], 'owner']);
      await refused(signInDoor1, 'unauthenticated');
      for (const u of ['manager', 'owner']) assert.equal((await d.signIn({ username: u, password: u })).role, u);
    } },
    { cls: 'answer', input: 'seed', expected: 'the three views in seed order manager, door1, owner', check: async (seeded) => { assert.deepEqual(seeded, await Promise.all(['manager', 'door1', 'owner'].map(byName))); } },
  ];
  for (const { cls, input, expected, arrange, check } of rows) test(`${cls}: ${input} -> ${expected}`, async () => { await arrange?.(); const before = await d.listStaffAccounts(); await check(await d.seedStaffAccounts(), before); });
});
