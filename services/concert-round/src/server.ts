// The composition root of the Concert Round Service process: the Round DB, the ports, then the gRPC transport.
import { grpcPort } from '@seats/config/src/index.js';
import { connectStore, wire } from './infrastructure/index.js';
import { startGrpc } from './api/grpc.js';

await connectStore();                                // the Round DB (ADR-06): MongoDB with CONCERT_ROUND_MONGO_URL or MONGO_URL, else in memory
wire();                                              // the repositories, the Media Storage Adapter and the Table Availability client behind the domain's ports
startGrpc(grpcPort('concert-round'));                      // the only transport (ADR-12): the API Gateway and the Booking Service call it by gRPC
