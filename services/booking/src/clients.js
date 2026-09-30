// gRPC clients of the Concert Round Service and the Table Availability Service (ADR-12). Every call carries a deadline.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const here = path.dirname(fileURLToPath(import.meta.url));
const load = (file, ns) => grpc.loadPackageDefinition(protoLoader.loadSync(path.resolve(here, '../../../proto', file), { keepCase: false, longs: Number, defaults: true })).seats[ns].v1;
const roundPkg = load('concert_round.proto', 'concertround');
const tablePkg = load('table_availability.proto', 'tableavailability');
const roundClient = new roundPkg.ConcertRound(process.env.CONCERT_ROUND_GRPC ?? 'localhost:5001', grpc.credentials.createInsecure());
const tableClient = new tablePkg.TableAvailability(process.env.TABLE_AVAILABILITY_GRPC ?? 'localhost:5003', grpc.credentials.createInsecure());

const DEADLINE_MS = 2000;
const call = (client, method, request) => new Promise((resolve, reject) =>
  client[method](request, { deadline: Date.now() + DEADLINE_MS }, (err, response) => (err ? reject(err) : resolve(response))));

export const concertRound = {
  getRound: (roundId) => call(roundClient, 'getRound', { roundId }),
  getRoundPricing: (roundId) => call(roundClient, 'getRoundPricing', { roundId }),
  getCheckInWindow: (roundId) => call(roundClient, 'getCheckInWindow', { roundId }),
};

export const tableAvailability = {
  holdTable: (req) => call(tableClient, 'holdTable', req),
  releaseHold: (req) => call(tableClient, 'releaseHold', req),
  markTableBooked: (req) => call(tableClient, 'markTableBooked', req),
  markTableOccupied: (req) => call(tableClient, 'markTableOccupied', req),
};

export const GRPC_STATUS = grpc.status;
