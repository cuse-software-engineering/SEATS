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
import { GATEWAY, waitForGateway } from './gateway.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const seconds = await waitForGateway();
console.log(`scenarios over the network against ${GATEWAY} (healthy after ${seconds} s)\n`);

const dir = join(ROOT, 'monolith', 'test', 'scenarios');
const files = readdirSync(dir).filter((f) => f.endsWith('.test.ts')).sort().map((f) => join(dir, f));
const run = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, GATEWAY } });
process.exit(run.status ?? 1);
