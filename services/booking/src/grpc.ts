// gRPC transport of the Booking Service: the whole API (proto/booking.proto), one handler per operation of Table 5.3.
// The caller's identity comes from the metadata x-user-id that the API Gateway sets. No rules here.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import type { ProtoGrpcType } from '@seats/proto/gen/booking';
import type { ProtoGrpcType as HealthProto } from '@seats/proto/gen/health';
import type { BookingsHandlers } from '@seats/proto/gen/seats/booking/v1/Bookings';
import type { HealthHandlers } from '@seats/proto/gen/grpc/health/v1/Health';
import type { Booking as BookingMessage } from '@seats/proto/gen/seats/booking/v1/Booking';
import type { Booking, BookingView } from './model.js';
import * as d from './domain.js';

const PROTO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../proto');
const OPTS = { keepCase: false, longs: Number, defaults: true };
const pkg = grpc.loadPackageDefinition(protoLoader.loadSync(path.join(PROTO_DIR, 'booking.proto'), OPTS)) as unknown as ProtoGrpcType;
const health = grpc.loadPackageDefinition(protoLoader.loadSync(path.join(PROTO_DIR, 'health.proto'), OPTS)) as unknown as HealthProto;

const CODES: Record<number, grpc.status> = { 400: grpc.status.INVALID_ARGUMENT, 404: grpc.status.NOT_FOUND, 409: grpc.status.FAILED_PRECONDITION, 501: grpc.status.UNIMPLEMENTED };

class Unauthenticated extends Error {}

function toGrpcError(e: unknown): grpc.ServiceError {
  if (e instanceof Unauthenticated) return Object.assign(e, { code: grpc.status.UNAUTHENTICATED, details: e.message, metadata: new grpc.Metadata() });
  if (e instanceof d.DomainError) {
    const metadata = new grpc.Metadata();
    if (e.details !== undefined) metadata.set('error-details-bin', Buffer.from(JSON.stringify(e.details)));   // the gateway puts it in the JSON body
    return Object.assign(new Error(e.message), { code: CODES[e.status] ?? grpc.status.INTERNAL, details: e.message, metadata });
  }
  const collaborator = typeof e === 'object' && e !== null && 'code' in e;   // the Concert Round or Table Availability Service refused or is down
  const message = e instanceof Error ? e.message : String(e);
  return Object.assign(new Error(message), { code: collaborator ? grpc.status.UNAVAILABLE : grpc.status.INTERNAL, details: message, metadata: new grpc.Metadata() });
}

/** The caller: the LINE user id (customer) or the staff account that the API Gateway authenticated (FR-66). */
const caller = (metadata: grpc.Metadata): string => {
  const id = metadata.get('x-user-id')[0];
  if (!id) throw new Unauthenticated('x-user-id metadata is required');
  return String(id);
};

const unary = <Req, Res>(fn: (req: Req, me: string) => Res | Promise<Res>): grpc.handleUnaryCall<Req, Res> => (call, callback) => {
  Promise.resolve().then(() => fn(call.request, caller(call.metadata))).then((res) => callback(null, res), (e: unknown) => callback(toGrpcError(e)));
};

const toBooking = (b: Booking | BookingView): BookingMessage =>
  ({ ...b, partySize: b.partySize ?? undefined, remainingHoldSeconds: 'remainingHoldSeconds' in b ? b.remainingHoldSeconds : 0 });

const handlers: BookingsHandlers = {
  CreateHeldBooking: unary(async ({ roundId, tableNumber }, me) => toBooking(await d.createHeldBooking(me, { roundId, tableNumber }))),
  GetBooking: unary(({ bookingId }, me) => toBooking(d.getBooking(bookingId, me))),
  SetPartySize: unary(async ({ bookingId, partySize }, me) => toBooking(await d.setPartySize(bookingId, me, { partySize }))),
  GetCustomerProfile: unary((_req, me) => d.getCustomerProfile(me)),
  CreateCustomerProfile: unary((profile, me) => d.createCustomerProfile(me, profile)),
  UpdateCustomerProfile: unary(({ name, phone }, me) => d.updateCustomerProfile(me, { name, phone })),
  GetBookingTerms: unary(({ bookingId }, me) => d.getBookingTerms(bookingId, me)),
  AcceptBookingTerms: unary(({ bookingId }, me) => toBooking(d.acceptBookingTerms(bookingId, me))),
  StartPayment: unary(({ bookingId }, me) => d.startPayment(bookingId, me)),
  CancelBooking: unary(async ({ bookingId }, me) => toBooking(await d.cancelBooking(bookingId, me))),
  GetCustomerBookings: unary((_req, me) => ({ bookings: d.getCustomerBookings(me).map(toBooking) })),
  GetETicket: unary(() => d.getETicket()),
  VerifyBookingReference: unary(() => d.verifyBookingReference()),
  CheckInBooking: unary(() => d.checkInBooking()),
  GetRoundBookings: unary(({ roundId }) => ({ bookings: d.getRoundBookings(roundId).map(toBooking) })),
  ConfirmBookingPayment: unary(() => { throw new d.DomainError(501, 'confirmBookingPayment() is built with the Payment Service in progress 2'); }),
};

const healthHandlers: HealthHandlers = { Check: (_call, callback) => callback(null, { status: 1 }) };   // SERVING

export function startGrpc(port: number): grpc.Server {
  const server = new grpc.Server();
  server.addService(pkg.seats.booking.v1.Bookings.service, handlers);
  server.addService(health.grpc.health.v1.Health.service, healthHandlers);
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
    if (err) throw err;
    console.log(`[booking] gRPC on :${port}`);
  });
  return server;
}
