#!/usr/bin/env node
// `npm run test:api`: the use case scenarios of monolith/test/scenarios run over the network against a running system,
// the same files `npm test` runs in-process. GATEWAY names the API Gateway (default http://localhost:4000: `npm run dev`
// for the seven processes, `npm run dev:mono`, `docker compose up`, or a deployment such as the Render monolith).
// The script waits for /health to report every service (a sleeping Render instance takes up to a minute to wake), then
// runs node --test with GATEWAY in the environment. Scenarios that drive a service from inside the process are skipped
// and listed as such in the report.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GATEWAY = (process.env.GATEWAY ?? 'http://localhost:4000').replace(/\/$/, '');
const WAIT_MS = Number(process.env.GATEWAY_WAIT_MS ?? 90_000);

async function health() {
  try {
    const r = await fetch(`${GATEWAY}/health`, { signal: AbortSignal.timeout(10_000) });
    const body = await r.json();
    const down = (body.services ?? []).filter((s) => !s.ok).map((s) => s.service);
    return { up: r.ok && body.ok === true && down.length === 0, detail: down.length ? `services down: ${down.join(', ')}` : `HTTP ${r.status}` };
  } catch (e) {
    return { up: false, detail: e.cause?.code ?? e.name ?? String(e) };
  }
}

const started = Date.now();
let last;
for (;;) {
  last = await health();
  if (last.up) break;
  if (Date.now() - started > WAIT_MS) {
    console.error(`no healthy gateway at ${GATEWAY} after ${Math.round(WAIT_MS / 1000)} s (${last.detail}); start one with npm run dev, npm run dev:mono or docker compose up, or set GATEWAY`);
    process.exit(2);
  }
  await new Promise((r) => setTimeout(r, 3000));
}
console.log(`scenarios over the network against ${GATEWAY} (healthy after ${Math.round((Date.now() - started) / 1000)} s)\n`);

const dir = join(ROOT, 'monolith', 'test', 'scenarios');
const files = readdirSync(dir).filter((f) => f.endsWith('.test.ts')).sort().map((f) => join(dir, f));
const run = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, GATEWAY } });
process.exit(run.status ?? 1);
