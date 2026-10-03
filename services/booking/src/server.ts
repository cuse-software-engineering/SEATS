// The composition root of the Booking Service as a process: the store, the ports bound to the infrastructure, the gRPC
// transport and the hold-expiry job. The monolith composes the same pieces in its own process (ADR-14).
import { connectStore, wire } from './infrastructure/index.js';
import { startGrpc } from './api/grpc.js';
import { expireUnpaidBookings } from './domain/index.js';

const EXPIRY_JOB_MS = Number(process.env.EXPIRY_JOB_MS ?? 5000);   // ADR-08: every 5 s, so a hold is released within 10 s of its end

await connectStore();                                // the Booking DB (ADR-06): MongoDB when BOOKING_MONGO_URL or MONGO_URL is set, else in memory
wire();                                              // the repositories and the gRPC clients behind the domain's ports
startGrpc(Number(process.env.GRPC_PORT ?? 5002));   // the only transport (ADR-12): the API Gateway calls it by gRPC
setInterval(() => { expireUnpaidBookings().catch((e: Error) => console.error('[booking] expiry job failed:', e.message)); }, EXPIRY_JOB_MS).unref();
