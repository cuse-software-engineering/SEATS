// gRPC transport of the Table Availability Service: loads the contract and maps DomainError to gRPC status codes.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import * as domain from './domain.js';

const PROTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../proto/table_availability.proto');
const pkg = grpc.loadPackageDefinition(protoLoader.loadSync(PROTO, { keepCase: false, longs: Number, defaults: true })).seats.tableavailability.v1;

const CODES = { 400: grpc.status.INVALID_ARGUMENT, 404: grpc.status.NOT_FOUND, 409: grpc.status.FAILED_PRECONDITION };

const unary = (fn) => (call, callback) => {
  try {
    callback(null, fn(call.request));
  } catch (e) {
    callback({ code: CODES[e.status] ?? grpc.status.INTERNAL, message: e.message });
  }
};

export function startGrpc(port) {
  const server = new grpc.Server();
  server.addService(pkg.TableAvailability.service, {
    initializeRoundTableStatus: unary(domain.initializeRoundTableStatus),
    getRoundTableStatus: unary(domain.getRoundTableStatus),
    countAvailableTables: unary(domain.countAvailableTables),
    holdTable: unary(domain.holdTable),
    releaseHold: unary(domain.releaseHold),
    markTableBooked: unary(domain.markTableBooked),
    markTableOccupied: unary(domain.markTableOccupied),
    removeRoundTableStatus: unary(domain.removeRoundTableStatus),
  });
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
    if (err) throw err;
    console.log(`[table-availability] gRPC on :${port}`);
  });
  return server;
}
