// The repositories of the Booking DB, one per aggregate (the booking, the customer profile) plus the lock of a table
// (ADR-13). The domain asks these questions in its own words; every answer comes from Collection<T> of store.ts, so the
// one implementation serves the in-memory store and MongoDB alike. No other module takes a collection handle.
import { collection, DuplicateKeyError } from './store.js';
import type { Booking, CustomerProfile } from './model.js';

export interface BookingRepository {
  /** The booking with this id, or null. */
  get(id: string): Promise<Booking | null>;
  /** Inserts or replaces the booking; answers it as given. */
  save(b: Booking): Promise<Booking>;
  /** Forgets the booking (a hold the read model refused). */
  remove(id: string): Promise<void>;
  /** Every booking of the customer (FR-40). */
  ofCustomer(customerId: string): Promise<Booking[]>;
  /** Every booking of the round (FR-42 live view). */
  ofRound(roundId: string): Promise<Booking[]>;
  /** The Held bookings whose holdEndsAt <= time: what the expiry job takes (ADR-08). */
  heldEndingBy(time: number): Promise<Booking[]>;
}

export interface CustomerProfileRepository {
  /** The profile of the LINE user, or null before the first booking. */
  get(customerId: string): Promise<CustomerProfile | null>;
  /** Inserts or replaces the profile; answers it as given. */
  save(p: CustomerProfile): Promise<CustomerProfile>;
}

/** The lock of a table in a round (ADR-13): one document per occupied table, keyed roundId/tableNumber, inserted with
 *  the hold and removed when the booking stops occupying the table. insert() is atomic on every store, so of several
 *  concurrent holds exactly one wins (BRULE-03, NFR-20). */
export interface TableLock {
  /** Takes the table for the booking; false when another booking holds it (the insert hits DuplicateKeyError). */
  acquire(roundId: string, tableNumber: number, bookingId: string): Promise<boolean>;
  /** Frees the table, only when this booking holds the lock (the table may have been re-held since). */
  release(roundId: string, tableNumber: number, bookingId: string): Promise<void>;
}

const bookingDocs = collection<Booking>('bookings');
const profileDocs = collection<CustomerProfile>('profiles');   // keyed by the LINE user id
const lockDocs = collection<{ bookingId: string }>('holds');
const lockKey = (roundId: string, tableNumber: number) => `${roundId}/${tableNumber}`;

export const bookings: BookingRepository = {
  get: (id) => bookingDocs.get(id),
  save: (b) => bookingDocs.put(b.id, b),
  remove: async (id) => { await bookingDocs.delete(id); },
  ofCustomer: (customerId) => bookingDocs.find({ customerId }),
  ofRound: (roundId) => bookingDocs.find({ roundId }),
  heldEndingBy: async (time) => (await bookingDocs.find({ status: 'Held' })).filter((b) => new Date(b.holdEndsAt).getTime() <= time),
};

export const profiles: CustomerProfileRepository = {
  get: (customerId) => profileDocs.get(customerId),
  save: (p) => profileDocs.put(p.customerId, p),
};

export const tableLock: TableLock = {
  acquire: async (roundId, tableNumber, bookingId) => {
    try { await lockDocs.insert(lockKey(roundId, tableNumber), { bookingId }); return true; } catch (e) { if (e instanceof DuplicateKeyError) return false; throw e; }
  },
  release: async (roundId, tableNumber, bookingId) => {
    const key = lockKey(roundId, tableNumber);
    if ((await lockDocs.get(key))?.bookingId === bookingId) await lockDocs.delete(key);
  },
};
