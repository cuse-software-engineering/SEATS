import { startGrpc } from './grpc.js';
import { seedStaffAccounts } from './domain.js';

seedStaffAccounts();                                  // progress 1: manager/manager, door1/door1, owner/owner
startGrpc(Number(process.env.GRPC_PORT ?? 5006));   // the only transport (ADR-12): the API Gateway calls it by gRPC
