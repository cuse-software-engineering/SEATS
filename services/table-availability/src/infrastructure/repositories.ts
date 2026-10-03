// The repositories of this service: the implementation of the domain's repository interfaces over Collection<T> of
// ./store.js, so memory and MongoDB are served alike (ADR-06). index.ts binds them to the domain's ports (wire()).
import type { RoundTableStatus } from '../domain/model.js';
import type { RoundTableStatusRepository } from '../domain/repository.js';
import { collection } from './store.js';

const rounds = collection<RoundTableStatus>('roundTableStatus');

/** The Table Status DB in the words of the domain: one document per round, keyed by roundId. */
export const roundTables: RoundTableStatusRepository = {
  get: (roundId) => rounds.get(roundId),
  getMany: (roundIds) => Promise.all(roundIds.map((id) => rounds.get(id))),
  save: (doc) => rounds.put(doc.roundId, doc),
  remove: (roundId) => rounds.delete(roundId),
};
