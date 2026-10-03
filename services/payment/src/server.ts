// The composition root of the Payment Service process: the Payment DB, the ports bound to their implementations, the
// gRPC server. The monolith mode (ADR-14) does the same for the six services in one process.
import { grpcPort } from '@seats/config/src/index.js';
import { connectStore, wire } from './infrastructure/index.js';
import { startGrpc } from './api/grpc.js';

await connectStore();                                // the Payment DB (ADR-06): MongoDB when configured, or in memory with no PAYMENT_MONGO_URL
wire();                                              // the repositories and the (simulated) Payment Gateway behind the domain's ports
startGrpc(grpcPort('payment'));                      // the only transport (ADR-12): the API Gateway (webhook, status) and the Booking Service call it by gRPC
