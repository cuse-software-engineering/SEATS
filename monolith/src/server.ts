// One process for development (ADR-14): `npm run dev:mono`. The gateway's REST API on :4000, the six services behind
// it in memory. Not a deployment target: the MVP is deployed as the seven processes of docker-compose.yml.
import { connectStore as connectRoundStore } from '@seats/concert-round/src/store.js';
import { startJobs, wireMonolith } from './wire.js';

await connectRoundStore();   // the Round DB (ADR-06): hydrates from MongoDB when CONCERT_ROUND_MONGO_URL is set, else stays in memory as before
wireMonolith();
startJobs();
const { createApp } = await import('@seats/gateway/src/app.js');   // after the wiring: the route table binds the client methods when it loads
const PORT = Number(process.env.PORT ?? 4000);
createApp().listen(PORT, () => console.log(`[monolith] REST on :${PORT}; the six services run in this process, calls in memory (ADR-14)`));
