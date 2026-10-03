import { startGrpc } from './grpc.js';
import { connectStore } from './store.js';

await connectStore();                                // the Round DB (ADR-06): MongoDB with CONCERT_ROUND_MONGO_URL or MONGO_URL, else in memory
startGrpc(Number(process.env.GRPC_PORT ?? 5001));   // the only transport (ADR-12): the API Gateway and the Booking Service call it by gRPC
