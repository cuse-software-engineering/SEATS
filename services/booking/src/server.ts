import { restApp } from './rest.js';
import { expireUnpaidBookings } from './domain.js';

const REST_PORT = Number(process.env.PORT ?? 4002);
const EXPIRY_JOB_MS = Number(process.env.EXPIRY_JOB_MS ?? 5000);   // ADR-08: every 5 s, so a hold is released within 10 s of its end

restApp().listen(REST_PORT, () => console.log(`[booking] REST on :${REST_PORT}`));
setInterval(() => { expireUnpaidBookings().catch((e: Error) => console.error('[booking] expiry job failed:', e.message)); }, EXPIRY_JOB_MS).unref();
