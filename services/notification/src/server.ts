import { grpcPort } from '@seats/config/src/index.js';
import { connectStore, wire } from './infrastructure/index.js';
import { startGrpc } from './api/grpc.js';
import { retryFailedMessages } from './domain/index.js';

await connectStore();   // the Notification DB (ADR-06): MongoDB with NOTIFICATION_MONGO_URL or MONGO_URL, else in memory
wire();                 // binds the repositories and the LINE adapter to the domain's ports

const RETRY_JOB_MS = Number(process.env.NOTIFICATION_RETRY_MS ?? 100_000);   // FR-22: three retries within five minutes

startGrpc(grpcPort('notification'));                      // the only transport (ADR-12): the Booking and Payment Services call it by gRPC
setInterval(() => { retryFailedMessages().catch((e: Error) => console.error('[notification] retry job failed:', e.message)); }, RETRY_JOB_MS).unref();
