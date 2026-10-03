import { connectStore } from './store.js';
import { startGrpc } from './grpc.js';
import { retryFailedMessages } from './domain.js';

await connectStore();   // the Notification DB (ADR-06): MongoDB with NOTIFICATION_MONGO_URL or MONGO_URL, else in memory

const RETRY_JOB_MS = Number(process.env.NOTIFICATION_RETRY_MS ?? 100_000);   // FR-22: three retries within five minutes

startGrpc(Number(process.env.GRPC_PORT ?? 5005));   // the only transport (ADR-12): the Booking and Payment Services call it by gRPC
setInterval(() => { retryFailedMessages().catch((e: Error) => console.error('[notification] retry job failed:', e.message)); }, RETRY_JOB_MS).unref();
