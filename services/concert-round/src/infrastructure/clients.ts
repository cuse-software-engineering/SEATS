// gRPC client of the Table Availability Service (ADR-12). Every call carries a deadline; a collaborator that does not
// answer (down, slow, broken) is an InfrastructureError naming it, while its own refusals pass through for the domain.
// Implements the TableAvailabilityClient port; the monolith patches this object for in-process calls.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { fromCollaborator } from '@seats/errors/src/index.js';
import type { ProtoGrpcType } from '@seats/proto/gen/table_availability';
import type { CreateRoundTableStatusRequest } from '@seats/proto/gen/seats/tableavailability/v1/CreateRoundTableStatusRequest';
import type { RoundTableStatus__Output } from '@seats/proto/gen/seats/tableavailability/v1/RoundTableStatus';
import type { CountAvailableTablesResponse__Output } from '@seats/proto/gen/seats/tableavailability/v1/CountAvailableTablesResponse';
import type { RemoveRoundTableStatusResponse__Output } from '@seats/proto/gen/seats/tableavailability/v1/RemoveRoundTableStatusResponse';
import type { TableAvailabilityClient } from '../domain/ports.js';

const PROTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../proto/table_availability.proto');
const pkg = grpc.loadPackageDefinition(protoLoader.loadSync(PROTO, { keepCase: false, longs: Number, defaults: true })) as unknown as ProtoGrpcType;
const client = new pkg.seats.tableavailability.v1.TableAvailability(process.env.TABLE_AVAILABILITY_GRPC ?? 'localhost:5003', grpc.credentials.createInsecure());

const DEADLINE_MS = 2000;
const opts = (): grpc.CallOptions => ({ deadline: Date.now() + DEADLINE_MS });
const promisify = <Res>(run: (cb: grpc.requestCallback<Res>) => void) =>
  new Promise<Res>((resolve, reject) => run((err, res) => (err ? reject(fromCollaborator('the Table Availability Service', err)) : resolve(res as Res))));

export const tableAvailability: TableAvailabilityClient = {
  createRoundTableStatus: (req: CreateRoundTableStatusRequest) => promisify<RoundTableStatus__Output>((cb) => client.createRoundTableStatus(req, opts(), cb)),
  getRoundTableStatus: (roundId: string) => promisify<RoundTableStatus__Output>((cb) => client.getRoundTableStatus({ roundId }, opts(), cb)),
  countAvailableTables: (roundIds: string[]) => promisify<CountAvailableTablesResponse__Output>((cb) => client.countAvailableTables({ roundIds }, opts(), cb)),
  removeRoundTableStatus: (roundId: string) => promisify<RemoveRoundTableStatusResponse__Output>((cb) => client.removeRoundTableStatus({ roundId }, opts(), cb)),
};
