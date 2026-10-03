// The composition root of the monolith mode (ADR-14): the only module that knows every service. It points the client
// objects of the API Gateway and of the services at the API layers of the other services, in this process, and starts
// what the service processes would start on their own (the seeded staff accounts, the hold-expiry job).
import * as gateway from '@seats/gateway/src/clients.js';
import * as bookingClients from '@seats/booking/src/infrastructure/clients.js';
import * as roundClients from '@seats/concert-round/src/infrastructure/clients.js';
import { api as roundApi, toServiceError as roundError } from '@seats/concert-round/src/api/handlers.js';
import { api as tableApi, toServiceError as tableError } from '@seats/table-availability/src/api/handlers.js';
import { api as bookingApi, toServiceError as bookingError } from '@seats/booking/src/api/handlers.js';
import { api as paymentApi, toServiceError as paymentError } from '@seats/payment/src/api/handlers.js';
import { api as notificationApi, toServiceError as notificationError } from '@seats/notification/src/api/handlers.js';
import { api as staffApi, toServiceError as staffError } from '@seats/staff-account/src/api/handlers.js';
import { wire as wireRounds } from '@seats/concert-round/src/infrastructure/index.js';
import { wire as wireTables } from '@seats/table-availability/src/infrastructure/index.js';
import { wire as wireBookings } from '@seats/booking/src/infrastructure/index.js';
import { wire as wirePayments } from '@seats/payment/src/infrastructure/index.js';
import { wire as wireNotifications } from '@seats/notification/src/infrastructure/index.js';
import { wire as wireStaff } from '@seats/staff-account/src/infrastructure/index.js';
import { seedStaffAccounts } from '@seats/staff-account/src/domain/index.js';
import { expireUnpaidBookings } from '@seats/booking/src/domain/index.js';
import { retryFailedMessages } from '@seats/notification/src/domain/index.js';
import { inProcess, serviceDefinition } from './inprocess.js';

/** Rewires every client to in-process calls. Call it before the gateway's route table loads (it binds the client methods). */
export async function wireMonolith(): Promise<void> {
  // each service binds its own infrastructure to its domain's ports (repositories, adapters, the client objects patched below)
  for (const wire of [wireRounds, wireTables, wireBookings, wirePayments, wireNotifications, wireStaff]) wire();
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
  await seedStaffAccounts();
}

/** The jobs the service processes run on their own timers: the hold expiry of the Booking Service (ADR-08) and the retry of the Notification Service (FR-22). */
export function startJobs(): NodeJS.Timeout[] {
  return [
    setInterval(() => { expireUnpaidBookings().catch((e: Error) => console.error('[booking] expiry job failed:', e.message)); }, Number(process.env.EXPIRY_JOB_MS ?? 5000)).unref(),
    setInterval(() => { retryFailedMessages().catch((e: Error) => console.error('[notification] retry job failed:', e.message)); }, Number(process.env.NOTIFICATION_RETRY_MS ?? 100_000)).unref(),
  ];
}

import type grpc from '@grpc/grpc-js';
