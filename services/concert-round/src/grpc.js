// gRPC transport: the three reads that other services call (proto/concert_round.proto).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import * as d from './domain.js';

const PROTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../proto/concert_round.proto');
const pkg = grpc.loadPackageDefinition(protoLoader.loadSync(PROTO, { keepCase: false, longs: Number, defaults: true })).seats.concertround.v1;
const CODES = { 400: grpc.status.INVALID_ARGUMENT, 404: grpc.status.NOT_FOUND, 409: grpc.status.FAILED_PRECONDITION };
const unary = (fn) => (call, cb) => { try { cb(null, fn(call.request)); } catch (e) { cb({ code: CODES[e.status] ?? grpc.status.INTERNAL, message: e.message }); } };

export function startGrpc(port) {
  const server = new grpc.Server();
  server.addService(pkg.ConcertRound.service, {
    getRound: unary(({ roundId }) => {
      const r = d.getRound(roundId);
      return { roundId: r.id, name: r.name, artist: r.artist, status: r.status, date: r.date, doorsOpenAt: r.doorsOpenAt, startAt: r.startAt, bookingOpenAt: r.bookingOpenAt, zoneMapId: r.zoneMapId, holdPeriodMinutes: r.holdPeriodMinutes, tables: d.getRoundTables(roundId) };
    }),
    getRoundPricing: unary(({ roundId }) => d.getRoundPricing(roundId)),
    getCheckInWindow: unary(({ roundId }) => d.getCheckInWindow(roundId)),
  });
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
    if (err) throw err;
    console.log(`[concert-round] gRPC on :${port}`);
  });
  return server;
}
