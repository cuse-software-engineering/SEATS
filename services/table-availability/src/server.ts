import { restApp } from './rest.js';
import { startGrpc } from './grpc.js';

const REST_PORT = Number(process.env.PORT ?? 4003);
const GRPC_PORT = Number(process.env.GRPC_PORT ?? 5003);

startGrpc(GRPC_PORT);
restApp().listen(REST_PORT, () => console.log(`[table-availability] REST on :${REST_PORT}`));
