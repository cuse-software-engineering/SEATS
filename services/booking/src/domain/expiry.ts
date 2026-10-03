// UC-01 EF-1 hold expiry (FR-23, ADR-08): a job on the service's own timer, not an operation. server.ts and the monolith
// run it every 5 s, so a hold is released within 10 s of its end.
import { ports } from './ports.js';
import { transition } from './shared.js';

export async function expireUnpaidBookings(now = Date.now()): Promise<string[]> {
  const expired: string[] = [];
  for (const b of await ports.bookings.heldEndingBy(now)) {
    await transition(b, 'Expired', 'hold-expiry job');
    await ports.tableLock.release(b.roundId, b.tableNumber, b.id);                                 // the table is no longer occupied by this booking
    await ports.tableAvailability.releaseHold({ roundId: b.roundId, tableNumber: b.tableNumber, bookingId: b.id })
      .catch((e: Error) => console.warn(`[booking] releaseHold retry later: ${e.message}`));
    console.log(`[booking] hold expired for booking ${b.id}; Notification Service sendHoldExpiredNotice() comes in progress 2`);
    expired.push(b.id);
  }
  return expired;
}
