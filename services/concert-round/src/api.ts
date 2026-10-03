// The API layer of the Concert Round Service: one function per method of concert_round.proto, from the request message
// to the response message (ADR-14). grpc.ts wraps it as the gRPC server; the monolith mode calls it in-process. The
// domain is asynchronous, so every handler answers a promise, which both callers await.
import grpc from '@grpc/grpc-js';
import type { ApiOf, CallContext } from '@seats/proto/api';
import type { ConcertRoundHandlers } from '@seats/proto/gen/seats/concertround/v1/ConcertRound';
import type { Round } from '@seats/proto/gen/seats/concertround/v1/Round';
import type { Round as RoundRecord } from './model.js';
import * as d from './domain.js';

const CODES: Record<number, grpc.status> = { 400: grpc.status.INVALID_ARGUMENT, 404: grpc.status.NOT_FOUND, 409: grpc.status.FAILED_PRECONDITION, 501: grpc.status.UNIMPLEMENTED, 503: grpc.status.UNAVAILABLE };

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
const toRound = async (r: RoundRecord & { confirmedBookings?: number }): Promise<Round> => ({
  ...r,
  checkInWindow: r.checkInWindow ? { roundId: r.id, ...r.checkInWindow } : null,
  holdPeriodMinutes: (r.parameters ?? (await d.getBusinessParameters())).holdPeriodMinutes,
  tables: (await d.getRoundTables(r.id)).map((t) => ({ ...t, packagePrice: t.packagePrice ?? undefined })),
});

/** A Draft round is the Manager's: a Customer who asks for it by id gets NOT_FOUND (UC-03 AF-1). */
const visible = <R extends { id: string; status: string }>(r: R, ctx: CallContext): R => {
  if (ctx.role === 'customer' && r.status !== 'Published') throw new d.DomainError(404, `round ${r.id} not found`);
  return r;
};

export const api: ApiOf<ConcertRoundHandlers> = {
  DefineTableType: ({ id, ...type }) => d.defineTableType(id, type),
  ListTableTypes: async () => ({ tableTypes: await d.listTableTypes() }),
  GetBusinessParameters: () => d.getBusinessParameters(),
  UpdateBusinessParameters: (patch) => d.updateBusinessParameters(defined(patch)),

  CreateZoneMap: ({ name }) => d.createZoneMap({ name }),
  ListZoneMaps: async ({ status }) => ({ zoneMaps: await d.listZoneMaps({ status }) }),
  GetZoneMap: ({ zoneMapId }) => d.getZoneMap(zoneMapId),
  UpdateZoneMap: ({ zoneMapId, name, zones, tables }) => d.updateZoneMap(zoneMapId, { name, zones: zones?.zones, tables: tables?.tables }),
  UploadZoneMapImage: ({ zoneMapId, fileName }) => d.uploadZoneMapImage(zoneMapId, { fileName }),
  ValidateZoneMap: ({ zoneMapId }) => d.validateZoneMap(zoneMapId),
  ActivateZoneMap: async ({ zoneMapId }) => d.getZoneMap((await d.activateZoneMap(zoneMapId)).id),
  DiscardDraftZoneMap: ({ zoneMapId }) => d.discardDraftZoneMap(zoneMapId),

  CreateRound: async ({ name }) => toRound(await d.createRound({ name })),
  GetUpcomingRounds: async () => ({ rounds: await d.getUpcomingRounds() }),
  GetRound: async ({ roundId }, ctx) => toRound(visible(await d.getRound(roundId), ctx)),
  GetRoundTables: async ({ roundId }, ctx) => ({ tables: (await d.getRoundTables(visible(await d.getRound(roundId), ctx).id)).map((t) => ({ ...t, packagePrice: t.packagePrice ?? undefined })) }),
  UpdateRound: async ({ roundId, tablesNotForSale, prices, ...fields }) =>
    toRound(await d.updateRound(roundId, { ...defined(fields), ...(tablesNotForSale ? { tablesNotForSale: tablesNotForSale.values } : {}), ...(prices ? { prices: prices.values } : {}) })),
  ValidateRound: ({ roundId }) => d.validateRound(roundId),
  PublishRound: async ({ roundId }) => toRound(await d.publishRound(roundId)),
  DiscardDraftRound: ({ roundId }) => d.discardDraftRound(roundId),

  GetRoundPricing: ({ roundId }) => d.getRoundPricing(roundId),
  GetCheckInWindow: ({ roundId }) => d.getCheckInWindow(roundId),
};
