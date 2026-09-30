// The composition root of the monolith mode (ADR-14): the only module that knows every service. It points the client
// objects of the API Gateway and of the services at the API layers of the other services, in this process, and starts
// what the service processes would start on their own (the seeded staff accounts, the hold-expiry job).
import * as gateway from '@seats/gateway/src/clients.js';
import * as bookingClients from '@seats/booking/src/clients.js';
import * as roundClients from '@seats/concert-round/src/clients.js';
import { api as roundApi, toServiceError as roundError } from '@seats/concert-round/src/api.js';
import { api as tableApi, toServiceError as tableError } from '@seats/table-availability/src/api.js';
import { api as bookingApi, toServiceError as bookingError } from '@seats/booking/src/api.js';
import { api as paymentApi, toServiceError as paymentError } from '@seats/payment/src/api.js';
import { api as notificationApi, toServiceError as notificationError } from '@seats/notification/src/api.js';
import { api as staffApi, toServiceError as staffError } from '@seats/staff-account/src/api.js';
import { seedStaffAccounts } from '@seats/staff-account/src/domain.js';
import { expireUnpaidBookings } from '@seats/booking/src/domain.js';
import { inProcess, serviceDefinition } from './inprocess.js';

/** Rewires every client to in-process calls. Call it before the gateway's route table loads (it binds the client methods). */
export function wireMonolith(): void {
  const round = inProcess(serviceDefinition('concert_round.proto', 'seats', 'concertround', 'v1', 'ConcertRound'), roundApi, roundError);
  const tables = inProcess(serviceDefinition('table_availability.proto', 'seats', 'tableavailability', 'v1', 'TableAvailability'), tableApi, tableError);
  const bookings = inProcess(serviceDefinition('booking.proto', 'seats', 'booking', 'v1', 'Bookings'), bookingApi, bookingError);
  const payment = inProcess(serviceDefinition('payment.proto', 'seats', 'payment', 'v1', 'Payment'), paymentApi, paymentError);
  const notification = inProcess(serviceDefinition('notification.proto', 'seats', 'notification', 'v1', 'Notification'), notificationApi, notificationError);
  const staff = inProcess(serviceDefinition('staff_account.proto', 'seats', 'staffaccount', 'v1', 'StaffAccounts'), staffApi, staffError);

  // the gateway: the same route table, the calls in memory
  Object.assign(gateway.concertRound, round.callback);
  Object.assign(gateway.tableAvailability, tables.callback);
  Object.assign(gateway.bookings, bookings.callback);
  Object.assign(gateway.payment, payment.callback);
  Object.assign(gateway.notification, notification.callback);
  Object.assign(gateway.staffAccounts, staff.callback);
  for (const health of Object.values(gateway.healthOf)) {
    Object.assign(health, { check: (...args: unknown[]) => { (args[args.length - 1] as grpc.requestCallback<unknown>)(null, { status: 1 }); return {}; } });
  }
  // service to service: the Booking Service reads rounds and reports the hold; the Concert Round Service creates and counts the table map
  Object.assign(bookingClients.concertRound, {
    getRound: (roundId: string) => round.promise.GetRound({ roundId }),
    getRoundPricing: (roundId: string) => round.promise.GetRoundPricing({ roundId }),
    getCheckInWindow: (roundId: string) => round.promise.GetCheckInWindow({ roundId }),
  });
  Object.assign(bookingClients.tableAvailability, {
    holdTable: (req: unknown) => tables.promise.HoldTable(req),
    releaseHold: (req: unknown) => tables.promise.ReleaseHold(req),
    markTableBooked: (req: unknown) => tables.promise.MarkTableBooked(req),
    markTableOccupied: (req: unknown) => tables.promise.MarkTableOccupied(req),
  });
  Object.assign(roundClients.tableAvailability, {
    createRoundTableStatus: (req: unknown) => tables.promise.CreateRoundTableStatus(req),
    getRoundTableStatus: (roundId: string) => tables.promise.GetRoundTableStatus({ roundId }),
    countAvailableTables: (roundIds: string[]) => tables.promise.CountAvailableTables({ roundIds }),
    removeRoundTableStatus: (roundId: string) => tables.promise.RemoveRoundTableStatus({ roundId }),
  });
  seedStaffAccounts();
}

/** The hold-expiry job of the Booking Service (ADR-08), which its own process runs on a timer. */
export function startJobs(): NodeJS.Timeout {
  const every = Number(process.env.EXPIRY_JOB_MS ?? 5000);
  return setInterval(() => { expireUnpaidBookings().catch((e: Error) => console.error('[booking] expiry job failed:', e.message)); }, every).unref();
}

import type grpc from '@grpc/grpc-js';
