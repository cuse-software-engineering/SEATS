// gRPC clients of the six services (ADR-12): the gateway is the only component that speaks REST, and every route
// of routes.ts is one call on one of these clients. Every call carries a deadline.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import type { ProtoGrpcType as ConcertRoundProto } from '@seats/proto/gen/concert_round';
import type { ProtoGrpcType as BookingProto } from '@seats/proto/gen/booking';
import type { ProtoGrpcType as TableAvailabilityProto } from '@seats/proto/gen/table_availability';
import type { ProtoGrpcType as PaymentProto } from '@seats/proto/gen/payment';
import type { ProtoGrpcType as NotificationProto } from '@seats/proto/gen/notification';
import type { ProtoGrpcType as StaffAccountProto } from '@seats/proto/gen/staff_account';
import type { ProtoGrpcType as HealthProto } from '@seats/proto/gen/health';

const PROTO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../proto');
const OPTS = { keepCase: false, longs: Number, defaults: true };
const load = (file: string) => grpc.loadPackageDefinition(protoLoader.loadSync(path.join(PROTO_DIR, file), OPTS));
const creds = grpc.credentials.createInsecure();

export const ADDRESSES = {
  'concert-round': process.env.CONCERT_ROUND_GRPC ?? 'localhost:5001',
  booking: process.env.BOOKING_GRPC ?? 'localhost:5002',
  'table-availability': process.env.TABLE_AVAILABILITY_GRPC ?? 'localhost:5003',
  payment: process.env.PAYMENT_GRPC ?? 'localhost:5004',
  notification: process.env.NOTIFICATION_GRPC ?? 'localhost:5005',
  'staff-account': process.env.STAFF_ACCOUNT_GRPC ?? 'localhost:5006',
};

export const concertRound = new (load('concert_round.proto') as unknown as ConcertRoundProto).seats.concertround.v1.ConcertRound(ADDRESSES['concert-round'], creds);
export const bookings = new (load('booking.proto') as unknown as BookingProto).seats.booking.v1.Bookings(ADDRESSES.booking, creds);
export const tableAvailability = new (load('table_availability.proto') as unknown as TableAvailabilityProto).seats.tableavailability.v1.TableAvailability(ADDRESSES['table-availability'], creds);
export const payment = new (load('payment.proto') as unknown as PaymentProto).seats.payment.v1.Payment(ADDRESSES.payment, creds);
export const notification = new (load('notification.proto') as unknown as NotificationProto).seats.notification.v1.Notification(ADDRESSES.notification, creds);   // no route yet: the services call it
export const staffAccounts = new (load('staff_account.proto') as unknown as StaffAccountProto).seats.staffaccount.v1.StaffAccounts(ADDRESSES['staff-account'], creds);

const Health = (load('health.proto') as unknown as HealthProto).grpc.health.v1.Health;
export const healthOf = Object.fromEntries(Object.entries(ADDRESSES).map(([name, addr]) => [name, new Health(addr, creds)]));

export const SERVICE_NAMES = new Map<object, string>([[concertRound, 'ConcertRound'], [bookings, 'Bookings'], [tableAvailability, 'TableAvailability'], [payment, 'Payment'], [notification, 'Notification'], [staffAccounts, 'StaffAccounts']]);
export const DEADLINE_MS = Number(process.env.GRPC_DEADLINE_MS ?? 2000);
