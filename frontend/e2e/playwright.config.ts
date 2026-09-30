// Playwright end-to-end suite of the two web apps (frontend/README.md, "End-to-end tests"). The three servers are
// started from the repo root when they are not already up: the backend in monolith mode on :4000 (ADR-14), the
// Customer Web App on :5173 and the Back-office Web App on :5174. One project per web app; Chromium only.
import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));   // the repo root: every command is a root script
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
    { name: 'customer', testMatch: /uc-0[19]\.spec\.ts$/, use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5173' } },
    { name: 'backoffice', testMatch: /uc-0[348]\.spec\.ts$/, use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5174' } },
  ],
  webServer: [
    server('npm run dev:mono', 'http://localhost:4000/health'),
    server('npm run dev:customer', 'http://localhost:5173'),
    server('npm run dev:backoffice', 'http://localhost:5174'),
  ],
});
