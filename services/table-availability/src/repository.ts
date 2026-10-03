// The repository of the Table Status DB: the one place the domain reads and writes RoundTableStatus documents, in the
// words of the domain. One implementation over Collection<T> of ./store.js serves memory and MongoDB alike (ADR-06):
// every call is asynchronous and answers a copy, so a change to a document read here is kept only by save().
import { collection } from './store.js';
import type { RoundTableStatus } from './model.js';

export interface RoundTableStatusRepository {
  /** The table status of a round, or null when the round has none. */
  get(roundId: string): Promise<RoundTableStatus | null>;
  /** The table status of several rounds in the order asked, null for a round that has none (countAvailableTables). */
  getMany(roundIds: string[]): Promise<(RoundTableStatus | null)[]>;
  /** Inserts or replaces the table status of its round (one document per round, keyed by roundId); answers it as given. */
  save(doc: RoundTableStatus): Promise<RoundTableStatus>;
  /** Removes the table status of a round; true when it existed. */
  remove(roundId: string): Promise<boolean>;
}

const rounds = collection<RoundTableStatus>('roundTableStatus');

/** The repository of this service; domain.ts imports this object only. */
export const roundTables: RoundTableStatusRepository = {
  get: (roundId) => rounds.get(roundId),
  getMany: (roundIds) => Promise.all(roundIds.map((id) => rounds.get(id))),
  save: (doc) => rounds.put(doc.roundId, doc),
  remove: (roundId) => rounds.delete(roundId),
};
