import { startGrpc } from './grpc.js';

startGrpc(Number(process.env.GRPC_PORT ?? 5005));   // the only transport (ADR-12): the Booking and Payment Services call it by gRPC
