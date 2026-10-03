// The authorization matrix of the API Gateway (FR-66): every route of the route table × every identity. The gateway's
// own rule is tested here, not the services': an identity the route does not allow never reaches a service. Runs
// in-process and over the network (`npm run test:api`), where the route table is read from the gateway's source and
// the calls go to the running gateway.
//
//   identity \ route     auth: 'none'        roles include it     roles exclude it
//   anonymous            not 403             401 "no identity"    401 "no identity"
//   customer/staff/…     not 403             not 401, not 403     403 "role … may not"
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anonymous, call, H, type Headers } from './harness.js';

const { ROUTES } = await import('@seats/gateway/src/routes.js');   // after the harness: in-process the route table is bound to the in-memory services already
const IDENTITIES: Record<string, Headers> = { anonymous, customer: H('U-matrix', 'customer'), front_staff: H('door-matrix', 'front_staff'), manager: H('manager-matrix', 'manager'), owner: H('owner-matrix', 'owner') };
const withIds = (path: string) => path.replace(/:[a-zA-Z]+/g, () => randomUUID());   // any id: 404s are fine, 401/403 are what we look at
const BODY = {};   // an empty body: 400s are fine too

test('FR-66 authorization matrix: every route × every identity answers as the route table says', async () => {
  const failures: string[] = [];
  for (const route of ROUTES) {
    for (const [name, headers] of Object.entries(IDENTITIES)) {
      const r = await call(headers, route.method, withIds(route.path), route.method === 'GET' || route.method === 'DELETE' ? undefined : BODY);
      const cell = `${name} ${route.method} ${route.path}`;
      if (route.auth === 'none') { if (r.status === 403) failures.push(`${cell}: 403 on an open route`); continue; }
      if (name === 'anonymous') { if (r.status !== 401 || !/no identity/.test(r.json?.error ?? '')) failures.push(`${cell}: ${r.status} ${r.json?.error}, expected 401 no identity`); continue; }
      const allowed = route.roles.includes(name as (typeof route.roles)[number]);
      if (allowed && (r.status === 401 || r.status === 403)) failures.push(`${cell}: ${r.status} ${r.json?.error}, the role is allowed`);
      if (!allowed && (r.status !== 403 || !/may not/.test(r.json?.error ?? ''))) failures.push(`${cell}: ${r.status} ${r.json?.error}, expected 403 may not`);
    }
  }
  assert.deepEqual(failures, [], `${failures.length} cell(s) of ${ROUTES.length * Object.keys(IDENTITIES).length} differ from the route table`);
});

test('FR-66 the route table itself: every route names its roles or is open, and the open routes are only sign-in and the payment webhook', () => {
  for (const route of ROUTES) assert.ok(route.auth === 'none' || route.roles.length > 0, `${route.method} ${route.path} has no roles and is not open`);
  assert.deepEqual(ROUTES.filter((r) => r.auth === 'none').map((r) => `${r.method} ${r.path}`).sort(), ['POST /api/payments/webhook', 'POST /api/sessions']);
});
