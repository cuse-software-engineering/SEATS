// The demo reset of the monolith mode: POST /api/admin/reset empties the six databases and seeds the three staff
// accounts of progress 1 again, so a demo, or the Playwright suite against the deployment, starts from nothing. It is
// an operation on the stores, not on the domain: the business rules rightly forbid discarding a Published round or an
// Active zone map through the API, and the seed (demo/seed.mjs) goes through the API as a user would. The route is not
// part of the gateway's API (docs/openapi.yaml, FR-66): it exists only in this process and only when DEMO_RESET_TOKEN
// is set, and takes that token as `Authorization: Bearer`. The service processes have no such route: for microservice
// mode, `docker compose down -v`.
import { timingSafeEqual } from 'node:crypto';
import express from 'express';
import { resetStore as resetRounds } from '@seats/concert-round/src/infrastructure/index.js';
import { resetStore as resetTables } from '@seats/table-availability/src/infrastructure/index.js';
import { resetStore as resetBookings } from '@seats/booking/src/infrastructure/index.js';
import { resetStore as resetPayments } from '@seats/payment/src/infrastructure/index.js';
import { resetStore as resetNotifications } from '@seats/notification/src/infrastructure/index.js';
import { resetStore as resetStaff } from '@seats/staff-account/src/infrastructure/index.js';
import { seedStaffAccounts } from '@seats/staff-account/src/domain/index.js';

export const RESET_PATH = '/api/admin/reset';

const STORES: Record<string, () => Promise<void>> = {
  'concert-round': resetRounds, 'table-availability': resetTables, booking: resetBookings,
  payment: resetPayments, notification: resetNotifications, 'staff-account': resetStaff,
};

/** Empties every store (in memory or on MongoDB alike) and seeds the staff accounts again, as a fresh start does. */
export async function resetDemoData(): Promise<{ stores: string[]; staffAccounts: string[] }> {
  for (const reset of Object.values(STORES)) await reset();
  const seeded = await seedStaffAccounts();
  return { stores: Object.keys(STORES), staffAccounts: seeded.map((a) => a.username) };
}

const sameToken = (given: string, expected: string): boolean =>
  given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));

/** The gateway app behind the reset route when `token` is set; the gateway app alone when it is not. */
export function withDemoReset(gateway: express.Express, token: string | undefined): express.Express {
  if (!token) return gateway;
  const app = express();
  app.post(RESET_PATH, async (req, res) => {
    const given = /^Bearer\s+(.+)$/i.exec(req.get('authorization') ?? '')?.[1] ?? '';
    if (!sameToken(given, token)) { res.status(401).json({ error: 'the demo reset needs its token as Authorization: Bearer' }); return; }
    const started = Date.now();
    try {
      const result = await resetDemoData();
      console.log(`[monolith] demo reset: ${result.stores.length} stores emptied, staff accounts ${result.staffAccounts.join(', ')} seeded (${Date.now() - started} ms)`);
      res.json({ reset: true, ...result });
    } catch (e) {
      console.error('[monolith] demo reset failed:', e instanceof Error ? e.stack ?? e.message : e);
      res.status(500).json({ error: `the reset failed: ${e instanceof Error ? e.message : String(e)}` });
    }
  });
  app.use(gateway);   // everything else is the gateway's, its 404 included
  return app;
}
