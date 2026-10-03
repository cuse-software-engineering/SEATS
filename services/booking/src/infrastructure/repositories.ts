// The repositories of the Booking DB: the implementations of the domain's repository interfaces (domain/repository.ts),
// one per aggregate (the booking, the customer profile) plus the lock of a table (ADR-13). Every answer comes from
// Collection<T> of store.ts, so the one implementation serves the in-memory store and MongoDB alike. No other module
// takes a collection handle. index.ts binds them to the domain's ports with wire().
import type { Booking, CustomerProfile } from '../domain/model.js';
import type { BookingRepository, CustomerProfileRepository, TableLock } from '../domain/repository.js';
import { collection, DuplicateKeyError } from './store.js';

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

/** The insert is atomic on every store, so of several concurrent holds exactly one wins (BRULE-03, NFR-20). */
export const tableLock: TableLock = {
  acquire: async (roundId, tableNumber, bookingId) => {
    try { await lockDocs.insert(lockKey(roundId, tableNumber), { bookingId }); return true; } catch (e) { if (e instanceof DuplicateKeyError) return false; throw e; }
  },
  release: async (roundId, tableNumber, bookingId) => {
    const key = lockKey(roundId, tableNumber);
    if ((await lockDocs.get(key))?.bookingId === bookingId) await lockDocs.delete(key);
  },
};
