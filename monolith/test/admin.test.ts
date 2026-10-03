// The demo reset route of the monolith (src/admin.ts): absent without a token, refusing a wrong one, and with the
// right one leaving the system as a fresh start does: every store empty, the staff accounts seeded, the gateway's
// routes still behind the wrapper.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { wireMonolith } from '../src/wire.js';
import { RESET_PATH, withDemoReset } from '../src/admin.js';

await wireMonolith();
const { createApp } = await import('@seats/gateway/src/app.js');
const listen = (token?: string) => { const server = withDemoReset(createApp(), token).listen(0); return { server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }; };
const guarded = listen('s3cret'), plain = listen(undefined);   // the two share the stores of this process
after(() => { guarded.server.close(); plain.server.close(); });

type Headers = Record<string, string>;
const json: Headers = { 'content-type': 'application/json' };
const manager: Headers = { ...json, 'x-user-id': 'manager-nok', 'x-role': 'manager' };
async function call(url: string, method: string, path: string, headers: Headers, body?: unknown): Promise<{ status: number; json: any }> {
  const r = await fetch(url + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => null) };
}

test('without DEMO_RESET_TOKEN there is no reset route: the gateway answers its own 404', async () => {
  const r = await call(plain.url, 'POST', RESET_PATH, { authorization: 'Bearer anything' });
  assert.equal(r.status, 404);
  assert.match(r.json.error, /no route for POST \/api\/admin\/reset/);
});

test('a missing or a wrong token is refused with 401 and nothing is reset', async () => {
  const kept = await call(guarded.url, 'POST', '/api/rounds', manager, { name: 'kept' });
  assert.equal(kept.status, 200);
  assert.equal((await call(guarded.url, 'POST', RESET_PATH, {})).status, 401);
  assert.equal((await call(guarded.url, 'POST', RESET_PATH, { authorization: 'Bearer wrong' })).status, 401);
  assert.equal((await call(guarded.url, 'POST', RESET_PATH, { authorization: 'Bearer s3cre' })).status, 401);   // a prefix is not the token
  assert.equal((await call(guarded.url, 'GET', `/api/rounds/${kept.json.id}`, manager)).status, 200);
});

test('the right token empties every store and seeds the staff accounts again; the gateway still answers behind it', async () => {
  const gone = await call(guarded.url, 'POST', '/api/rounds', manager, { name: 'gone' });
  assert.equal(gone.status, 200);
  const r = await call(guarded.url, 'POST', RESET_PATH, { authorization: 'Bearer s3cret' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, {
    reset: true,
    stores: ['concert-round', 'table-availability', 'booking', 'payment', 'notification', 'staff-account'],
    staffAccounts: ['manager', 'door1', 'owner'],
  });
  assert.equal((await call(guarded.url, 'GET', `/api/rounds/${gone.json.id}`, manager)).status, 404);
  assert.deepEqual((await call(guarded.url, 'GET', '/api/rounds', manager)).json, []);
  const signIn = await call(guarded.url, 'POST', '/api/sessions', json, { username: 'manager', password: 'manager' });
  assert.equal(signIn.status, 200);
  assert.equal(signIn.json.role, 'manager');
  assert.equal((await call(guarded.url, 'GET', '/health', {})).status, 200);
  assert.equal((await call(guarded.url, 'GET', RESET_PATH, {})).status, 404);   // only POST
});
