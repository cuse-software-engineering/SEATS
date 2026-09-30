// Unit tests of the LINE Login Adapter of the gateway (ADR-01, BRULE-12): the fake of progress 1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeLineLogin, lineLoginFromEnv } from '../src/adapters.js';

test('the fake accepts fake-line-<user id> and reads the LINE user id from it', async () => {
  assert.deepEqual(await new FakeLineLogin().verifyIdToken('fake-line-U-somchai'), { userId: 'U-somchai' });
});

test('any other token does not verify', async () => {
  const fake = new FakeLineLogin();
  for (const t of ['', 'nonsense', 'fake-line-', 'Bearer fake-line-U', 'fake-line-U somchai']) assert.equal(await fake.verifyIdToken(t), null, t);
});

test('the adapter is chosen by configuration; only the fake exists in progress 1', () => {
  assert.ok(lineLoginFromEnv() instanceof FakeLineLogin);
  process.env.LINE_LOGIN = 'line';
  assert.throws(() => lineLoginFromEnv(), /only "fake" is built/);
  delete process.env.LINE_LOGIN;
});
