// Shared by the operations of every use case of the Booking Service: the view of a booking, the transition appended to
// its history (ADR-13), the owner check (FR-40) and what a progress 2 operation answers. No use case of its own.
import { DomainError } from '@seats/errors/src/index.js';
import { bookings } from '../repository.js';
import type { Booking, BookingStatus, BookingView } from '../model.js';

export const iso = (d: number | string | Date) => new Date(d).toISOString();
export const notImplemented = (op: string): never => { throw new DomainError('not_implemented', `${op} is built in progress 2`); };

export async function requireOwnBooking(id: string, customerId: string): Promise<Booking> {
  const b = await bookings.get(id);
  if (!b || b.customerId !== customerId) throw new DomainError('not_found', `booking ${id} not found`);   // FR-40: own bookings only
  return b;
}

/** One transition, appended to the booking's history (ADR-13). */
export async function transition(b: Booking, status: BookingStatus, by: string): Promise<Booking> {
  b.status = status;
  b.history.push({ status, at: iso(Date.now()), by });
  return bookings.save(b);
}

export const view = (b: Booking): BookingView =>
  ({ ...b, remainingHoldSeconds: b.status === 'Held' ? Math.max(0, Math.round((new Date(b.holdEndsAt).getTime() - Date.now()) / 1000)) : 0 });
