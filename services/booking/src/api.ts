// The API layer of the Booking Service: one function per method of booking.proto, from the request message to the
// response message, with the caller from the call context (ADR-14). grpc.ts wraps it; the monolith mode calls it.
import grpc from '@grpc/grpc-js';
import type { ApiOf, CallContext } from '@seats/proto/api';
import type { BookingsHandlers } from '@seats/proto/gen/seats/booking/v1/Bookings';
import type { Booking as BookingMessage } from '@seats/proto/gen/seats/booking/v1/Booking';
import type { Booking, BookingView } from './model.js';
import * as d from './domain.js';

const CODES: Record<number, grpc.status> = { 400: grpc.status.INVALID_ARGUMENT, 404: grpc.status.NOT_FOUND, 409: grpc.status.FAILED_PRECONDITION, 501: grpc.status.UNIMPLEMENTED };

class Unauthenticated extends Error {}

/** A DomainError as the gRPC status the caller sees; a failing collaborator is UNAVAILABLE. */
export function toServiceError(e: unknown): grpc.ServiceError {
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
const caller = (ctx: CallContext): string => {
  if (!ctx.caller) throw new Unauthenticated('x-user-id metadata is required');
  return ctx.caller;
};

const toBooking = (b: Booking | BookingView): BookingMessage =>
  ({ ...b, partySize: b.partySize ?? undefined, remainingHoldSeconds: 'remainingHoldSeconds' in b ? b.remainingHoldSeconds : 0 });

export const api: ApiOf<BookingsHandlers> = {
  CreateHeldBooking: async ({ roundId, tableNumber }, ctx) => toBooking(await d.createHeldBooking(caller(ctx), { roundId, tableNumber })),
  GetBooking: async ({ bookingId }, ctx) => toBooking(await d.getBooking(bookingId, caller(ctx))),
  SetPartySize: async ({ bookingId, partySize }, ctx) => toBooking(await d.setPartySize(bookingId, caller(ctx), { partySize })),
  GetCustomerProfile: (_req, ctx) => d.getCustomerProfile(caller(ctx)),
  CreateCustomerProfile: (profile, ctx) => d.createCustomerProfile(caller(ctx), profile),
  UpdateCustomerProfile: ({ name, phone }, ctx) => d.updateCustomerProfile(caller(ctx), { name, phone }),
  GetBookingTerms: ({ bookingId }, ctx) => d.getBookingTerms(bookingId, caller(ctx)),
  AcceptBookingTerms: async ({ bookingId }, ctx) => toBooking(await d.acceptBookingTerms(bookingId, caller(ctx))),
  StartPayment: ({ bookingId }, ctx) => d.startPayment(bookingId, caller(ctx)),
  CancelBooking: async ({ bookingId }, ctx) => toBooking(await d.cancelBooking(bookingId, caller(ctx))),
  GetCustomerBookings: async (_req, ctx) => ({ bookings: (await d.getCustomerBookings(caller(ctx))).map(toBooking) }),
  GetETicket: () => d.getETicket(),
  VerifyBookingReference: () => d.verifyBookingReference(),
  CheckInBooking: () => d.checkInBooking(),
  GetRoundBookings: async ({ roundId }) => ({ bookings: (await d.getRoundBookings(roundId)).map(toBooking) }),
  ConfirmBookingPayment: () => { throw new d.DomainError(501, 'confirmBookingPayment() is built with the Payment Service in progress 2'); },
};
