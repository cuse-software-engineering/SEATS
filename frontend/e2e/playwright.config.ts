// Playwright end-to-end suite of the two web apps (frontend/README.md, "End-to-end tests"). The three servers are
// started from the repo root when they are not already up: the backend in monolith mode (ADR-14), the Customer
// Web App and the Back-office Web App, at the ports @seats/config names. One project per web app; Chromium only.
import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { gatewayUrl, webAppPort } from '../../packages/config/src/index.js';   // relative: Playwright's loader maps .js to .ts for its own files only

const root = fileURLToPath(new URL('../..', import.meta.url));   // the repo root: every command is a root script
const CUSTOMER = `http://localhost:${webAppPort('customer')}`, BACK_OFFICE = `http://localhost:${webAppPort('back-office')}`;   // the dev servers, from @seats/config
const server = (command: string, url: string) => ({ command, url, cwd: root, reuseExistingServer: true, timeout: 90_000 });

export default defineConfig({
  testDir: './tests',
  retries: 0,
  reporter: 'list',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'customer', testMatch: /uc-0[19]\.spec\.ts$/, use: { ...devices['Desktop Chrome'], baseURL: CUSTOMER } },
    { name: 'backoffice', testMatch: /uc-0[348]\.spec\.ts$/, use: { ...devices['Desktop Chrome'], baseURL: BACK_OFFICE } },
  ],
  webServer: [
    server('npm run dev:mono', `${gatewayUrl()}/health`),
    server('npm run dev:customer', CUSTOMER),
    server('npm run dev:backoffice', BACK_OFFICE),
  ],
});
