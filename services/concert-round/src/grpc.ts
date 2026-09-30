// gRPC transport of the Concert Round Service: the whole API (proto/concert_round.proto), one handler per operation of
// Table 5.3, DomainError mapped to a gRPC status. No rules here.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import type { ProtoGrpcType } from '@seats/proto/gen/concert_round';
import type { ProtoGrpcType as HealthProto } from '@seats/proto/gen/health';
import type { ConcertRoundHandlers } from '@seats/proto/gen/seats/concertround/v1/ConcertRound';
import type { HealthHandlers } from '@seats/proto/gen/grpc/health/v1/Health';
import type { Round } from '@seats/proto/gen/seats/concertround/v1/Round';
import type { Round as RoundRecord } from './model.js';
import * as d from './domain.js';

const PROTO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../proto');
const OPTS = { keepCase: false, longs: Number, defaults: true };
const pkg = grpc.loadPackageDefinition(protoLoader.loadSync(path.join(PROTO_DIR, 'concert_round.proto'), OPTS)) as unknown as ProtoGrpcType;
const health = grpc.loadPackageDefinition(protoLoader.loadSync(path.join(PROTO_DIR, 'health.proto'), OPTS)) as unknown as HealthProto;

const CODES: Record<number, grpc.status> = { 400: grpc.status.INVALID_ARGUMENT, 404: grpc.status.NOT_FOUND, 409: grpc.status.FAILED_PRECONDITION, 501: grpc.status.UNIMPLEMENTED };

function toGrpcError(e: unknown): grpc.ServiceError {
  if (e instanceof d.DomainError) {
    const metadata = new grpc.Metadata();
    if (e.details !== undefined) metadata.set('error-details-bin', Buffer.from(JSON.stringify(e.details)));   // the gateway puts it in the JSON body
    return Object.assign(new Error(e.message), { code: CODES[e.status] ?? grpc.status.INTERNAL, details: e.message, metadata });
  }
  const collaborator = typeof e === 'object' && e !== null && 'code' in e;   // the Table Availability Service refused or is down
  const message = e instanceof Error ? e.message : String(e);
  return Object.assign(new Error(message), { code: collaborator ? grpc.status.UNAVAILABLE : grpc.status.INTERNAL, details: message, metadata: new grpc.Metadata() });
}

const unary = <Req, Res>(fn: (req: Req) => Res | Promise<Res>): grpc.handleUnaryCall<Req, Res> => (call, callback) => {
  Promise.resolve().then(() => fn(call.request)).then((res) => callback(null, res), (e: unknown) => callback(toGrpcError(e)));
};

const defined = <T extends object>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

/** The Round message: the stored round plus what the callers derive from it (hold period, its tables). */
const toRound = (r: RoundRecord & { confirmedBookings?: number }): Round => ({
  ...r,
  checkInWindow: r.checkInWindow ? { roundId: r.id, ...r.checkInWindow } : null,
  holdPeriodMinutes: (r.parameters ?? d.getBusinessParameters()).holdPeriodMinutes,
  tables: d.getRoundTables(r.id).map((t) => ({ ...t, packagePrice: t.packagePrice ?? undefined })),
});

const handlers: ConcertRoundHandlers = {
  DefineTableType: unary(({ id, ...type }) => d.defineTableType(id, type)),
  ListTableTypes: unary(() => ({ tableTypes: d.listTableTypes() })),
  GetBusinessParameters: unary(() => d.getBusinessParameters()),
  UpdateBusinessParameters: unary((patch) => d.updateBusinessParameters(defined(patch))),

  CreateZoneMap: unary(({ name }) => d.createZoneMap({ name })),
  ListZoneMaps: unary(({ status }) => ({ zoneMaps: d.listZoneMaps({ status }) })),
  GetZoneMap: unary(({ zoneMapId }) => d.getZoneMap(zoneMapId)),
  UpdateZoneMap: unary(({ zoneMapId, name, zones, tables }) => d.updateZoneMap(zoneMapId, { name, zones: zones?.zones, tables: tables?.tables })),
  UploadZoneMapImage: unary(({ zoneMapId, fileName }) => d.uploadZoneMapImage(zoneMapId, { fileName })),
  ValidateZoneMap: unary(({ zoneMapId }) => d.validateZoneMap(zoneMapId)),
  ActivateZoneMap: unary(({ zoneMapId }) => d.getZoneMap(d.activateZoneMap(zoneMapId).id)),
  DiscardDraftZoneMap: unary(({ zoneMapId }) => d.discardDraftZoneMap(zoneMapId)),

  CreateRound: unary(({ name }) => toRound(d.createRound({ name }))),
  GetUpcomingRounds: unary(async () => ({ rounds: await d.getUpcomingRounds() })),
  GetRound: unary(({ roundId }) => toRound(d.getRound(roundId))),
  GetRoundTables: unary(({ roundId }) => ({ tables: d.getRoundTables(roundId).map((t) => ({ ...t, packagePrice: t.packagePrice ?? undefined })) })),
  UpdateRound: unary(async ({ roundId, tablesNotForSale, prices, ...fields }) =>
    toRound(await d.updateRound(roundId, { ...defined(fields), ...(tablesNotForSale ? { tablesNotForSale: tablesNotForSale.values } : {}), ...(prices ? { prices: prices.values } : {}) }))),
  ValidateRound: unary(({ roundId }) => d.validateRound(roundId)),
  PublishRound: unary(async ({ roundId }) => toRound(await d.publishRound(roundId))),
  DiscardDraftRound: unary(({ roundId }) => d.discardDraftRound(roundId)),

  GetRoundPricing: unary(({ roundId }) => d.getRoundPricing(roundId)),
  GetCheckInWindow: unary(({ roundId }) => d.getCheckInWindow(roundId)),
};

const healthHandlers: HealthHandlers = { Check: unary(() => ({ status: 1 })) };   // SERVING

export function startGrpc(port: number): grpc.Server {
  const server = new grpc.Server();
  server.addService(pkg.seats.concertround.v1.ConcertRound.service, handlers);
  server.addService(health.grpc.health.v1.Health.service, healthHandlers);
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
    if (err) throw err;
    console.log(`[concert-round] gRPC on :${port}`);
  });
  return server;
}
