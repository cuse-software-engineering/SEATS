import { startGrpc } from './grpc.js';

startGrpc(Number(process.env.GRPC_PORT ?? 5001));   // the only transport (ADR-12): the API Gateway and the Booking Service call it by gRPC
