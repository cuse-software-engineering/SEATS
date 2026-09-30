// gRPC client of the Table Availability Service (ADR-12). Every call carries a deadline.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const PROTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../proto/table_availability.proto');
const pkg = grpc.loadPackageDefinition(protoLoader.loadSync(PROTO, { keepCase: false, longs: Number, defaults: true })).seats.tableavailability.v1;
const client = new pkg.TableAvailability(process.env.TABLE_AVAILABILITY_GRPC ?? 'localhost:5003', grpc.credentials.createInsecure());

const DEADLINE_MS = 2000;
const call = (method, request) => new Promise((resolve, reject) =>
  client[method](request, { deadline: Date.now() + DEADLINE_MS }, (err, response) => (err ? reject(err) : resolve(response))));

export const tableAvailability = {
  initializeRoundTableStatus: (req) => call('initializeRoundTableStatus', req),
  getRoundTableStatus: (roundId) => call('getRoundTableStatus', { roundId }),
  countAvailableTables: (roundIds) => call('countAvailableTables', { roundIds }),
  removeRoundTableStatus: (roundId) => call('removeRoundTableStatus', { roundId }),
};
