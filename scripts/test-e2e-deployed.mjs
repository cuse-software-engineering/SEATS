#!/usr/bin/env node
// `npm run test:e2e:deployed`: the Playwright suite against the deployment of README "Deploy". The demo is emptied
// through the reset route first, the tests run on the two Vercel apps with the Render backend, and at the end the demo
// is emptied and seeded again, so it is left ready for a demo. DEMO_RESET_TOKEN must be the backend's.
// GATEWAY, CUSTOMER_APP_URL and BACK_OFFICE_APP_URL override the three URLs of the deployment, all three for another
// deployment or the local servers to try the mechanism (DEMO_RESET_TOKEN=x npm run dev:mono, dev:customer,
// dev:backoffice, then the three localhost URLs). frontend/e2e/playwright.config.ts starts nothing for a URL it is given.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEPLOYMENT = {
  GATEWAY: 'https://seats-monolith.onrender.com',
  CUSTOMER_APP_URL: 'https://seats-customer.vercel.app',
  BACK_OFFICE_APP_URL: 'https://seats-back-office.vercel.app',
};
const env = { ...process.env, ...Object.fromEntries(Object.entries(DEPLOYMENT).map(([k, v]) => [k, process.env[k]?.trim() || v])) };
if (!env.DEMO_RESET_TOKEN?.trim()) {
  console.error('DEMO_RESET_TOKEN is not set: the backend\'s token (the Render dashboard, or the one npm run dev:mono was started with)');
  process.exit(2);
}
console.log(`end-to-end tests against ${env.CUSTOMER_APP_URL} and ${env.BACK_OFFICE_APP_URL}, backend ${env.GATEWAY}`);

const step = (label, command, args) => {
  console.log(`\n== ${label}`);
  return spawnSync(command, args, { cwd: ROOT, stdio: 'inherit', env }).status ?? 1;
};
const reset = join(ROOT, 'demo', 'reset.mjs');
if (step('reset the demo', process.execPath, [reset, '--no-seed']) !== 0) process.exit(2);
const tests = step('the Playwright suite', 'npm', ['run', 'test:e2e']);
const after = step('reset and seed the demo again', process.execPath, [reset]);
process.exit(tests !== 0 ? tests : after);
