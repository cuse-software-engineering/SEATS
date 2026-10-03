// One process for development (ADR-14): `npm run dev:mono`. The gateway's REST API on :4000, the six services behind
// it in memory. Not a deployment target: the MVP is deployed as the seven processes of docker-compose.yml.
import { connectStore as connectRounds } from '@seats/concert-round/src/infrastructure/index.js';
import { connectStore as connectTables } from '@seats/table-availability/src/infrastructure/index.js';
import { connectStore as connectBookings } from '@seats/booking/src/infrastructure/index.js';
import { connectStore as connectPayments } from '@seats/payment/src/infrastructure/index.js';
import { connectStore as connectNotifications } from '@seats/notification/src/infrastructure/index.js';
import { connectStore as connectStaff } from '@seats/staff-account/src/infrastructure/index.js';
import { startJobs, wireMonolith } from './wire.js';

// the six databases (ADR-06, one per service): MongoDB where <SERVICE>_MONGO_URL or MONGO_URL says so, else in memory
await Promise.all([connectRounds(), connectTables(), connectBookings(), connectPayments(), connectNotifications(), connectStaff()]);
await wireMonolith();
startJobs();
const { createApp } = await import('@seats/gateway/src/app.js');   // after the wiring: the route table binds the client methods when it loads
const PORT = Number(process.env.PORT ?? 4000);
createApp().listen(PORT, () => console.log(`[monolith] REST on :${PORT}; the six services run in this process, calls in memory (ADR-14)`));
