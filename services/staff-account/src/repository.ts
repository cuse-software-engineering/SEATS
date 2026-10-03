// The repositories of the Staff Account DB, one per aggregate: the domain's view of its accounts and sessions, with
// methods named after what the domain asks for. collection<T>() of store.ts is called here only; the domain imports
// `accounts` and `sessions` and never sees a Collection<T>. Reads answer copies (the store clones): a change is saved back.
import { collection } from './store.js';
import type { Session, StaffAccount } from './model.js';

export interface StaffAccountRepository {
  /** The account with this id, or null. */
  get(staffAccountId: string): Promise<StaffAccount | null>;
  /** The account of a username (unique); null for an empty or undefined username, which find() would otherwise ignore and match every account. */
  byUsername(username: string | undefined): Promise<StaffAccount | null>;
  /** Creates the account, never replaces one: DuplicateKeyError when the id exists, for the caller to name as its conflict. */
  insert(a: StaffAccount): Promise<StaffAccount>;
  /** Writes an account back under its id (the reads answer copies); answers the account as given. */
  save(a: StaffAccount): Promise<StaffAccount>;
  /** Every account, unsorted (the domain orders the list). */
  all(): Promise<StaffAccount[]>;
}

export interface SessionRepository {
  /** The session behind a token, or null when signed out. */
  get(token: string): Promise<Session | null>;
  /** Inserts or replaces the session under its token; answers the session as given. */
  save(s: Session): Promise<Session>;
  /** Ends the session; true when it existed (an unknown token is already signed out). */
  remove(token: string): Promise<boolean>;
  /** The open sessions of an account, to re-role or end them when the account changes. */
  ofAccount(staffAccountId: string): Promise<Session[]>;
}

const storedAccounts = collection<StaffAccount>('staffAccounts');
const storedSessions = collection<Session>('sessions');

/** The staff accounts of this service's database. */
export const accounts: StaffAccountRepository = {
  get: (staffAccountId) => storedAccounts.get(staffAccountId),
  byUsername: async (username) => username ? (await storedAccounts.find({ username }))[0] ?? null : null,
  insert: (a) => storedAccounts.insert(a.staffAccountId, a),
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
