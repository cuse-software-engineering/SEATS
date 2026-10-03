import { connectStore, wire } from './infrastructure/index.js';
import { startGrpc } from './api/grpc.js';
import { seedStaffAccounts } from './domain/index.js';

await connectStore();                                // the Staff Account DB (ADR-06): MongoDB with STAFF_ACCOUNT_MONGO_URL or MONGO_URL, else in memory
wire();                                              // binds the repositories to the domain's ports
await seedStaffAccounts();                            // progress 1: manager/manager, door1/door1, owner/owner (kept as they are when the DB has them)
startGrpc(Number(process.env.GRPC_PORT ?? 5006));   // the only transport (ADR-12): the API Gateway calls it by gRPC
