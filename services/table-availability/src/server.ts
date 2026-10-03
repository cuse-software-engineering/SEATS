import { connectStore, wire } from './infrastructure/index.js';
import { startGrpc } from './api/grpc.js';

await connectStore();   // chooses the Table Status DB implementation (memory or MongoDB) before any request is served
wire();                 // binds the repositories to the domain's ports

startGrpc(Number(process.env.GRPC_PORT ?? 5003));   // the only transport (ADR-12): the gateway and the other services call it by gRPC
