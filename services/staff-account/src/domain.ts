// Staff Account Service — one function per operation of its API. No transport code here. Sessions are in
// memory (ADR-07); the three accounts of progress 1 are seeded by seedStaffAccounts() with the password equal to the username.
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { collection } from './store.js';
import type { Session, StaffAccount, StaffAccountView, StaffRole } from './model.js';

export class DomainError extends Error {
  constructor(public readonly status: 400 | 401 | 404 | 409 | 501, message: string, public readonly details?: unknown) { super(message); }
}

const accounts = collection<StaffAccount>('staffAccounts');
const sessions = collection<Session>('sessions');
const ROLES: StaffRole[] = ['manager', 'front_staff', 'owner'];
const SEED: [string, StaffRole][] = [['manager', 'manager'], ['door1', 'front_staff'], ['owner', 'owner']];
const iso = (d: number) => new Date(d).toISOString();
const hash = (password: string, salt: string) => scryptSync(password, salt, 32).toString('hex');
const view = (a: StaffAccount): StaffAccountView => ({ staffAccountId: a.staffAccountId, username: a.username, role: a.role, status: a.status });

function requireAccount(staffAccountId: string): StaffAccount {
  const a = accounts.get(staffAccountId);
  if (!a) throw new DomainError(404, `staff account ${staffAccountId} not found`);
  return a;
}
const requireRole = (role: string | undefined): StaffRole => {
  if (!ROLES.includes(role as StaffRole)) throw new DomainError(400, `role must be ${ROLES.join(', ')}`);
  return role as StaffRole;
};
const requirePassword = (password: string | undefined): string => {
  if (!password || password.length < 4) throw new DomainError(400, 'password must have at least 4 characters');
  return password;
};

/** Progress 1: the three accounts of the demo, password = username. Idempotent. */
export function seedStaffAccounts(): StaffAccountView[] {
  return SEED.map(([username, role]) => {
    const existing = accounts.list().find((a) => a.username === username);
    return existing ? view(existing) : createStaffAccount({ username, role, password: username });
  });
}

/** UC-05: a staff member signs in with username and password and gets a session token (FR-66). */
export function signIn({ username, password }: { username?: string; password?: string }): { token: string; role: StaffRole; staffAccountId: string } {
  const a = accounts.list().find((x) => x.username === username);
  const ok = !!a && !!password && timingSafeEqual(Buffer.from(hash(password, a.passwordSalt), 'hex'), Buffer.from(a.passwordHash, 'hex'));
  if (!a || !ok) throw new DomainError(401, 'wrong username or password');
  if (a.status === 'Disabled') throw new DomainError(401, 'the account is disabled');
  const s: Session = { token: randomUUID(), staffAccountId: a.staffAccountId, role: a.role, createdAt: iso(Date.now()) };
  sessions.put(s.token, s);
  return { token: s.token, role: s.role, staffAccountId: s.staffAccountId };
}

/** Ends the session; an unknown token is already signed out. */
export function signOut({ token }: { token?: string }): Record<string, never> {
  if (token) sessions.delete(token);
  return {};
}

/** The session behind a token, for the gateway's staff auth (ADR-07, progress 2); null when signed out. */
export const getSession = (token: string): Session | null => sessions.get(token);

// ---------------------------------------------------------------- staff accounts (manager): C R U D
export function createStaffAccount({ username, role, password }: { username?: string; role?: string; password?: string }): StaffAccountView {
  if (!username?.trim()) throw new DomainError(400, 'username is required');
  const r = requireRole(role);
  const p = requirePassword(password);
  if (accounts.list().some((a) => a.username === username)) throw new DomainError(409, `username ${username} is taken`);
  const salt = randomBytes(16).toString('hex');
  const a: StaffAccount = { staffAccountId: randomUUID(), username: username.trim(), role: r, status: 'Active', passwordSalt: salt, passwordHash: hash(p, salt), createdAt: iso(Date.now()) };
  return view(accounts.put(a.staffAccountId, a));
}

export const listStaffAccounts = (): StaffAccountView[] => accounts.list().sort((a, b) => a.username.localeCompare(b.username)).map(view);

export function updateStaffAccount({ staffAccountId, role, password }: { staffAccountId?: string; role?: string; password?: string }): StaffAccountView {
  const a = requireAccount(staffAccountId ?? '');
  if (role !== undefined) a.role = requireRole(role);
  if (password !== undefined) { a.passwordSalt = randomBytes(16).toString('hex'); a.passwordHash = hash(requirePassword(password), a.passwordSalt); }
  for (const s of sessions.list().filter((s) => s.staffAccountId === a.staffAccountId)) sessions.put(s.token, { ...s, role: a.role });
  return view(accounts.put(a.staffAccountId, a));
}

/** D — a disabled account keeps its history but cannot sign in; its sessions end now. Idempotent. */
export function disableStaffAccount({ staffAccountId }: { staffAccountId?: string }): StaffAccountView {
  const a = requireAccount(staffAccountId ?? '');
  a.status = 'Disabled';
  for (const s of sessions.list().filter((s) => s.staffAccountId === a.staffAccountId)) sessions.delete(s.token);
  return view(accounts.put(a.staffAccountId, a));
}
