// Playwright end-to-end suite of the two web apps (frontend/README.md, "End-to-end tests"). The three URLs come from
// @seats/config: the dev servers on localhost by default, started from the repo root when they are not already up
// (the backend in monolith mode, ADR-14, the Customer Web App, the Back-office Web App); a URL given in the
// environment (GATEWAY, CUSTOMER_APP_URL, BACK_OFFICE_APP_URL) is a running system, a deployment for instance, and
// nothing is started for it: `npm run test:e2e:deployed` sets all three. One project per web app; Chromium only.
import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { gatewayUrl, webAppUrl } from '../../packages/config/src/index.js';   // relative: Playwright's loader maps .js to .ts for its own files only

const root = fileURLToPath(new URL('../..', import.meta.url));   // the repo root: every command is a root script
const GATEWAY = gatewayUrl(), CUSTOMER = webAppUrl('customer'), BACK_OFFICE = webAppUrl('back-office');
const given = (name: string): boolean => !!process.env[name]?.trim();
const deployed = given('GATEWAY') || given('CUSTOMER_APP_URL') || given('BACK_OFFICE_APP_URL');
// a dev server started here proxies /api to the gateway the tests seed through, wherever that is
const server = (command: string, url: string) => ({ command, url, cwd: root, reuseExistingServer: true, timeout: 90_000, env: { API_PROXY: GATEWAY } });

export default defineConfig({
  testDir: './tests',
  retries: 0,
  reporter: 'list',
  timeout: 90_000,
  expect: { timeout: deployed ? 20_000 : 10_000 },   // a round trip to the deployment is a few hundred milliseconds, a cold one a minute
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'customer', testMatch: /uc-0[19]\.spec\.ts$/, use: { ...devices['Desktop Chrome'], baseURL: CUSTOMER } },
    { name: 'backoffice', testMatch: /uc-0[348]\.spec\.ts$/, use: { ...devices['Desktop Chrome'], baseURL: BACK_OFFICE } },
  ],
  webServer: [
    ...(given('GATEWAY') ? [] : [server('npm run dev:mono', `${GATEWAY}/health`)]),
    ...(given('CUSTOMER_APP_URL') ? [] : [server('npm run dev:customer', CUSTOMER)]),
    ...(given('BACK_OFFICE_APP_URL') ? [] : [server('npm run dev:backoffice', BACK_OFFICE)]),
  ],
});
