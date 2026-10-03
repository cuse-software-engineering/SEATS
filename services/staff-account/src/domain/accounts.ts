// Staff Account Service — one function per operation of its API. No transport code here. Sessions are a collection of the
// Staff Account DB like the accounts (ADR-07); the three accounts of progress 1 are seeded by seedStaffAccounts() with the password equal to the username.
// The repositories are asynchronous and their reads answer copies: a function that changes an account it read saves it back.
// They are reached through the ports (ports.ts), bound by wire() of the infrastructure: this file imports no store and no repository implementation.
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { DomainError } from '@seats/errors/src/index.js';
import { ports } from './ports.js';
import type { Session, StaffAccount, StaffAccountView, StaffRole } from './model.js';
export { DomainError };   // the tests and the API layer name the refusals through the domain

const ROLES: StaffRole[] = ['manager', 'front_staff', 'owner'];
const SEED: [string, StaffRole][] = [['manager', 'manager'], ['door1', 'front_staff'], ['owner', 'owner']];
const iso = (d: number) => new Date(d).toISOString();
const hash = (password: string, salt: string) => scryptSync(password, salt, 32).toString('hex');
const view = (a: StaffAccount): StaffAccountView => ({ staffAccountId: a.staffAccountId, username: a.username, role: a.role, status: a.status });

async function requireAccount(staffAccountId: string): Promise<StaffAccount> {
  const a = await ports.accounts.get(staffAccountId);
  if (!a) throw new DomainError('not_found', `staff account ${staffAccountId} not found`);
  return a;
}
const requireRole = (role: string | undefined): StaffRole => {
  if (!ROLES.includes(role as StaffRole)) throw new DomainError('invalid', `role must be ${ROLES.join(', ')}`);
  return role as StaffRole;
};
const requirePassword = (password: string | undefined): string => {
  if (!password || password.length < 4) throw new DomainError('invalid', 'password must have at least 4 characters');
  return password;
};

/** Progress 1: the three accounts of the demo, password = username. Idempotent: an account the database already holds is kept as it is. */
export async function seedStaffAccounts(): Promise<StaffAccountView[]> {
  const seeded: StaffAccountView[] = [];
  for (const [username, role] of SEED) {
    const existing = await ports.accounts.byUsername(username);
    seeded.push(existing ? view(existing) : await createStaffAccount({ username, role, password: username }));
  }
  return seeded;
}

/** UC-05: a staff member signs in with username and password and gets a session token (FR-66). */
export async function signIn({ username, password }: { username?: string; password?: string }): Promise<{ token: string; role: StaffRole; staffAccountId: string }> {
  const a = await ports.accounts.byUsername(username);
  const ok = !!a && !!password && timingSafeEqual(Buffer.from(hash(password, a.passwordSalt), 'hex'), Buffer.from(a.passwordHash, 'hex'));
  if (!a || !ok) throw new DomainError('unauthenticated', 'wrong username or password');
  if (a.status === 'Disabled') throw new DomainError('unauthenticated', 'the account is disabled');
  const s: Session = { token: randomUUID(), staffAccountId: a.staffAccountId, role: a.role, createdAt: iso(Date.now()) };
  await ports.sessions.save(s);
  return { token: s.token, role: s.role, staffAccountId: s.staffAccountId };
}

/** Ends the session; an unknown token is already signed out. */
export async function signOut({ token }: { token?: string }): Promise<Record<string, never>> {
  if (token) await ports.sessions.remove(token);
  return {};
}

/** The session behind a token, for the gateway's staff auth (ADR-07, progress 2); null when signed out. */
export const getSession = (token: string): Promise<Session | null> => ports.sessions.get(token);

// ---------------------------------------------------------------- staff accounts (manager): C R U D
export async function createStaffAccount({ username, role, password }: { username?: string; role?: string; password?: string }): Promise<StaffAccountView> {
  const name = username?.trim() ?? '';                                                            // the stored name: the duplicate check uses the same one
  if (!name) throw new DomainError('invalid', 'username is required');
  const r = requireRole(role);
  const p = requirePassword(password);
  if (await ports.accounts.byUsername(name)) throw new DomainError('conflict', `username ${name} is taken`);
  const salt = randomBytes(16).toString('hex');
  const a: StaffAccount = { staffAccountId: randomUUID(), username: name, role: r, status: 'Active', passwordSalt: salt, passwordHash: hash(p, salt), createdAt: iso(Date.now()) };
  return view(await ports.accounts.insert(a));
}

export const listStaffAccounts = async (): Promise<StaffAccountView[]> => (await ports.accounts.all()).sort((a, b) => a.username.localeCompare(b.username)).map(view);

export async function updateStaffAccount({ staffAccountId, role, password }: { staffAccountId?: string; role?: string; password?: string }): Promise<StaffAccountView> {
  const a = await requireAccount(staffAccountId ?? '');
  if (role !== undefined) a.role = requireRole(role);
  if (password !== undefined) { a.passwordSalt = randomBytes(16).toString('hex'); a.passwordHash = hash(requirePassword(password), a.passwordSalt); }
  for (const s of await ports.sessions.ofAccount(a.staffAccountId)) await ports.sessions.save({ ...s, role: a.role });
  return view(await ports.accounts.save(a));
}

/** D — a disabled account keeps its history but cannot sign in; its sessions end now. Idempotent. */
export async function disableStaffAccount({ staffAccountId }: { staffAccountId?: string }): Promise<StaffAccountView> {
  const a = await requireAccount(staffAccountId ?? '');
  a.status = 'Disabled';
  for (const s of await ports.sessions.ofAccount(a.staffAccountId)) await ports.sessions.remove(s.token);
  return view(await ports.accounts.save(a));
}
