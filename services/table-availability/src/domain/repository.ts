// The repository of the Table Status DB as the domain sees it: the one place the rules read and write RoundTableStatus
// documents, in the words of the domain. Only the interface lives here; infrastructure/repositories.ts implements it
// over Collection<T> of @seats/store and wire() binds it to ports.roundTables (ADR-06): every call is asynchronous and
// answers a copy, so a change to a document read here is kept only by save().
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
