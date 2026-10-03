// The API layer of the Booking Service: one function per method of booking.proto, from the request message to the
// response message, with the caller from the call context (ADR-14). grpc.ts wraps it; the monolith mode calls it. The
// failures become gRPC statuses in toServiceError of @seats/errors, re-exported here for both.
import type { ApiOf, CallContext } from '@seats/proto/api';
import type { BookingsHandlers } from '@seats/proto/gen/seats/booking/v1/Bookings';
import type { Booking as BookingMessage } from '@seats/proto/gen/seats/booking/v1/Booking';
import { DomainError } from '@seats/errors/src/index.js';
import type { Booking, BookingView } from './model.js';
import * as d from './domain.js';

export { toServiceError } from '@seats/errors/src/index.js';

/** The caller: the LINE user id (customer) or the staff account that the API Gateway authenticated (FR-66). */
const caller = (ctx: CallContext): string => {
  if (!ctx.caller) throw new DomainError('unauthenticated', 'x-user-id metadata is required');
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
  ConfirmBookingPayment: () => { throw new d.DomainError('not_implemented', 'confirmBookingPayment() is built with the Payment Service in progress 2'); },
};
