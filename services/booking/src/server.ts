import { connectStore } from './store.js';
import { startGrpc } from './grpc.js';
import { expireUnpaidBookings } from './domain.js';

const EXPIRY_JOB_MS = Number(process.env.EXPIRY_JOB_MS ?? 5000);   // ADR-08: every 5 s, so a hold is released within 10 s of its end

await connectStore();                                // the Booking DB (ADR-06): MongoDB when BOOKING_MONGO_URL or MONGO_URL is set, else in memory
startGrpc(Number(process.env.GRPC_PORT ?? 5002));   // the only transport (ADR-12): the API Gateway calls it by gRPC
setInterval(() => { expireUnpaidBookings().catch((e: Error) => console.error('[booking] expiry job failed:', e.message)); }, EXPIRY_JOB_MS).unref();
