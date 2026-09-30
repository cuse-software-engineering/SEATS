// The API layer of the Concert Round Service: one function per method of concert_round.proto, from the request message
// to the response message (ADR-14). grpc.ts wraps it as the gRPC server; the monolith mode calls it in-process.
import grpc from '@grpc/grpc-js';
import type { ApiOf } from '@seats/proto/api';
import type { ConcertRoundHandlers } from '@seats/proto/gen/seats/concertround/v1/ConcertRound';
import type { Round } from '@seats/proto/gen/seats/concertround/v1/Round';
import type { Round as RoundRecord } from './model.js';
import * as d from './domain.js';

const CODES: Record<number, grpc.status> = { 400: grpc.status.INVALID_ARGUMENT, 404: grpc.status.NOT_FOUND, 409: grpc.status.FAILED_PRECONDITION, 501: grpc.status.UNIMPLEMENTED };

/** A DomainError as the gRPC status the caller sees; a failing collaborator is UNAVAILABLE. */
export function toServiceError(e: unknown): grpc.ServiceError {
  if (e instanceof d.DomainError) {
    const metadata = new grpc.Metadata();
    if (e.details !== undefined) metadata.set('error-details-bin', Buffer.from(JSON.stringify(e.details)));   // the gateway puts it in the JSON body
    return Object.assign(new Error(e.message), { code: CODES[e.status] ?? grpc.status.INTERNAL, details: e.message, metadata });
  }
  const collaborator = typeof e === 'object' && e !== null && 'code' in e;   // the Table Availability Service refused or is down
  const message = e instanceof Error ? e.message : String(e);
  return Object.assign(new Error(message), { code: collaborator ? grpc.status.UNAVAILABLE : grpc.status.INTERNAL, details: message, metadata: new grpc.Metadata() });
}

const defined = <T extends object>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

/** The Round message: the stored round plus what the callers derive from it (hold period, its tables). */
const toRound = (r: RoundRecord & { confirmedBookings?: number }): Round => ({
  ...r,
  checkInWindow: r.checkInWindow ? { roundId: r.id, ...r.checkInWindow } : null,
  holdPeriodMinutes: (r.parameters ?? d.getBusinessParameters()).holdPeriodMinutes,
  tables: d.getRoundTables(r.id).map((t) => ({ ...t, packagePrice: t.packagePrice ?? undefined })),
});

export const api: ApiOf<ConcertRoundHandlers> = {
  DefineTableType: ({ id, ...type }) => d.defineTableType(id, type),
  ListTableTypes: () => ({ tableTypes: d.listTableTypes() }),
  GetBusinessParameters: () => d.getBusinessParameters(),
  UpdateBusinessParameters: (patch) => d.updateBusinessParameters(defined(patch)),

  CreateZoneMap: ({ name }) => d.createZoneMap({ name }),
  ListZoneMaps: ({ status }) => ({ zoneMaps: d.listZoneMaps({ status }) }),
  GetZoneMap: ({ zoneMapId }) => d.getZoneMap(zoneMapId),
  UpdateZoneMap: ({ zoneMapId, name, zones, tables }) => d.updateZoneMap(zoneMapId, { name, zones: zones?.zones, tables: tables?.tables }),
  UploadZoneMapImage: ({ zoneMapId, fileName }) => d.uploadZoneMapImage(zoneMapId, { fileName }),
  ValidateZoneMap: ({ zoneMapId }) => d.validateZoneMap(zoneMapId),
  ActivateZoneMap: ({ zoneMapId }) => d.getZoneMap(d.activateZoneMap(zoneMapId).id),
  DiscardDraftZoneMap: ({ zoneMapId }) => d.discardDraftZoneMap(zoneMapId),

  CreateRound: ({ name }) => toRound(d.createRound({ name })),
  GetUpcomingRounds: async () => ({ rounds: await d.getUpcomingRounds() }),
  GetRound: ({ roundId }) => toRound(d.getRound(roundId)),
  GetRoundTables: ({ roundId }) => ({ tables: d.getRoundTables(roundId).map((t) => ({ ...t, packagePrice: t.packagePrice ?? undefined })) }),
  UpdateRound: async ({ roundId, tablesNotForSale, prices, ...fields }) =>
    toRound(await d.updateRound(roundId, { ...defined(fields), ...(tablesNotForSale ? { tablesNotForSale: tablesNotForSale.values } : {}), ...(prices ? { prices: prices.values } : {}) })),
  ValidateRound: ({ roundId }) => d.validateRound(roundId),
  PublishRound: async ({ roundId }) => toRound(await d.publishRound(roundId)),
  DiscardDraftRound: ({ roundId }) => d.discardDraftRound(roundId),

  GetRoundPricing: ({ roundId }) => d.getRoundPricing(roundId),
  GetCheckInWindow: ({ roundId }) => d.getCheckInWindow(roundId),
};
