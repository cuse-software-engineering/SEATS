// The repositories of the Staff Account DB over collection<T>() of store.ts: the implementations of the interfaces of
// ../domain/repository.ts, one per aggregate. index.ts binds them to the domain's ports with wire(); the domain never
// sees a Collection<T>. Reads answer copies (the store clones): a change is saved back.
import { DomainError } from '@seats/errors/src/index.js';
import type { Session, StaffAccount } from '../domain/model.js';
import type { SessionRepository, StaffAccountRepository } from '../domain/repository.js';
import { collection, DuplicateKeyError } from './store.js';

const storedAccounts = collection<StaffAccount>('staffAccounts');
const storedSessions = collection<Session>('sessions');

/** The staff accounts of this service's database. */
export const accounts: StaffAccountRepository = {
  get: (staffAccountId) => storedAccounts.get(staffAccountId),
  byUsername: async (username) => username ? (await storedAccounts.find({ username }))[0] ?? null : null,
  // the store's DuplicateKeyError is an infrastructure word: the domain hears a conflict
  insert: async (a) => {
    try { return await storedAccounts.insert(a.staffAccountId, a); }
    catch (e) { if (e instanceof DuplicateKeyError) throw new DomainError('conflict', `staff account ${a.staffAccountId} exists already`); throw e; }
  },
  save: (a) => storedAccounts.put(a.staffAccountId, a),
  all: () => storedAccounts.list(),
};

/** The sign-in sessions of this service's database. */
export const sessions: SessionRepository = {
  get: (token) => storedSessions.get(token),
  save: (s) => storedSessions.put(s.token, s),
  remove: (token) => storedSessions.delete(token),
  ofAccount: (staffAccountId) => storedSessions.find({ staffAccountId }),
};
