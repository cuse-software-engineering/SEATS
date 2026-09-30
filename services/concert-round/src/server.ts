import { restApp } from './rest.js';
import { startGrpc } from './grpc.js';

const REST_PORT = Number(process.env.PORT ?? 4001);
const GRPC_PORT = Number(process.env.GRPC_PORT ?? 5001);

startGrpc(GRPC_PORT);
restApp().listen(REST_PORT, () => console.log(`[concert-round] REST on :${REST_PORT}`));
