import { startGrpc } from './grpc.js';

startGrpc(Number(process.env.GRPC_PORT ?? 5004));   // the only transport (ADR-12): the API Gateway (webhook, status) and the Booking Service call it by gRPC
