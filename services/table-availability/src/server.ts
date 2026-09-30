import { startGrpc } from './grpc.js';

startGrpc(Number(process.env.GRPC_PORT ?? 5003));   // the only transport (ADR-12): the gateway and the other services call it by gRPC
