import { startGrpc } from './grpc.js';
import { connectStore } from './store.js';

await connectStore();                                // the Payment DB (ADR-06): MongoDB when configured, or in memory with no PAYMENT_MONGO_URL
startGrpc(Number(process.env.GRPC_PORT ?? 5004));   // the only transport (ADR-12): the API Gateway (webhook, status) and the Booking Service call it by gRPC
