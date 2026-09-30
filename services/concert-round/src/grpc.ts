// gRPC transport: the three reads that other services call (proto/concert_round.proto).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import type { ProtoGrpcType } from '@seats/proto/gen/concert_round';
import type { ConcertRoundHandlers } from '@seats/proto/gen/seats/concertround/v1/ConcertRound';
import * as d from './domain.js';

const PROTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../proto/concert_round.proto');
const pkg = grpc.loadPackageDefinition(protoLoader.loadSync(PROTO, { keepCase: false, longs: Number, defaults: true })) as unknown as ProtoGrpcType;
const CODES: Record<number, grpc.status> = { 400: grpc.status.INVALID_ARGUMENT, 404: grpc.status.NOT_FOUND, 409: grpc.status.FAILED_PRECONDITION };

const unary = <Req, Res>(fn: (req: Req) => Res): grpc.handleUnaryCall<Req, Res> => (call, cb) => {
  try { cb(null, fn(call.request)); } catch (e) {
    const err = e instanceof d.DomainError ? e : new Error(String(e));
    cb(Object.assign(err, { code: CODES[(err as d.DomainError).status] ?? grpc.status.INTERNAL }));
  }
};

const handlers: ConcertRoundHandlers = {
  GetRound: unary(({ roundId }) => {
    const r = d.getRound(roundId);
    return { roundId: r.id, name: r.name, artist: r.artist, status: r.status, date: r.date, doorsOpenAt: r.doorsOpenAt, startAt: r.startAt, bookingOpenAt: r.bookingOpenAt, zoneMapId: r.zoneMapId, holdPeriodMinutes: r.holdPeriodMinutes, tables: d.getRoundTables(roundId) };
  }),
  GetRoundPricing: unary(({ roundId }) => d.getRoundPricing(roundId)),
  GetCheckInWindow: unary(({ roundId }) => d.getCheckInWindow(roundId)),
};

export function startGrpc(port: number): grpc.Server {
  const server = new grpc.Server();
  server.addService(pkg.seats.concertround.v1.ConcertRound.service, handlers);
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
    if (err) throw err;
    console.log(`[concert-round] gRPC on :${port}`);
  });
  return server;
}
