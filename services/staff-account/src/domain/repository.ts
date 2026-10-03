// The repositories of the Staff Account DB, one per aggregate, as the domain sees them: interfaces with methods named
// after what the rules ask for. The implementations live in ../infrastructure/repositories.ts and reach the domain
// through its ports (ports.ts); the domain never sees a Collection<T> nor the store. Reads answer copies: a change is
// saved back.
import type { Session, StaffAccount } from './model.js';

export interface StaffAccountRepository {
  /** The account with this id, or null. */
  get(staffAccountId: string): Promise<StaffAccount | null>;
  /** The account of a username (unique); null for an empty or undefined username, which a find would otherwise ignore and match every account. */
  byUsername(username: string | undefined): Promise<StaffAccount | null>;
  /** Creates the account, never replaces one: rejects with DomainError('conflict') when the id exists already. */
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
