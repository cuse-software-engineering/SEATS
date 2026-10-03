// `npm run demo:reset`: empties the backend through POST /api/admin/reset of the monolith (monolith/src/admin.ts;
// DEMO_RESET_TOKEN both here and in the backend's environment) and seeds the demo data again with demo/seed.mjs.
// `--no-seed` only empties it. GATEWAY names the backend (default http://localhost:4000; the Render demo is
// https://seats-monolith.onrender.com, its token in the Render dashboard).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { GATEWAY, waitForGateway } from '../scripts/gateway.mjs';

const token = process.env.DEMO_RESET_TOKEN?.trim();
if (!token) {
  console.error('DEMO_RESET_TOKEN is not set: the token the backend was started with (DEMO_RESET_TOKEN=… npm run dev:mono, or the Render environment)');
  process.exit(2);
}
await waitForGateway();
const r = await fetch(`${GATEWAY}/api/admin/reset`, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
const body = await r.json().catch(() => null);
if (r.status === 404) { console.error(`${GATEWAY} has no reset route: only the monolith started with DEMO_RESET_TOKEN has one (microservice mode: docker compose down -v)`); process.exit(2); }
if (r.status === 401) { console.error(`${GATEWAY} refused the token: DEMO_RESET_TOKEN here is not the backend's`); process.exit(2); }
if (!r.ok) { console.error(`reset failed: ${r.status} ${JSON.stringify(body)}`); process.exit(1); }
console.log(`reset ${GATEWAY}: ${body.stores.length} stores emptied; staff accounts ${body.staffAccounts.join(', ')} seeded`);
if (process.argv.includes('--no-seed')) process.exit(0);

const seed = spawnSync(process.execPath, [fileURLToPath(new URL('./seed.mjs', import.meta.url))], { stdio: 'inherit', env: process.env });
process.exit(seed.status ?? 1);
