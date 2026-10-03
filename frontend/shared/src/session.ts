// The signed-in identity, a Zustand store kept in localStorage so a reload keeps it. Progress 1 authentication is
// fake: two headers, x-user-id and x-role (openapi.yaml, securitySchemes). The customer app stores a LINE user id
// typed once (LINE Login comes with ADR-01); the back-office stores the answer of POST /api/sessions.
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

export type Role = 'customer' | 'manager' | 'front_staff' | 'owner';
export interface Session {
  userId: string;   // x-user-id: the LINE user id, or the staff account id
  role: Role;       // x-role
  token?: string;   // the staff session token of POST /api/sessions, sent as Authorization: Bearer (ADR-07)
  label?: string;   // what the header shows, e.g. the username
}

const KEY = 'seats.session';
const ROLES: readonly string[] = ['customer', 'manager', 'front_staff', 'owner'];
const isSession = (v: unknown): v is Session =>
  typeof v === 'object' && v !== null && typeof (v as Session).userId === 'string' && ROLES.includes(String((v as Session).role));

function load(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

interface SessionState { session: Session | null; setSession: (s: Session) => void; clearSession: () => void }

export const sessionStore = createStore<SessionState>((set) => ({
  session: load(),
  setSession: (session) => {
    try { localStorage.setItem(KEY, JSON.stringify(session)); } catch { /* storage blocked: kept in memory only */ }
    set({ session });
  },
  clearSession: () => {
    try { localStorage.removeItem(KEY); } catch { /* storage blocked */ }
    set({ session: null });
  },
}));

export const getSession = (): Session | null => sessionStore.getState().session;
export const setSession = (s: Session): void => sessionStore.getState().setSession(s);
export const clearSession = (): void => sessionStore.getState().clearSession();
/** For useSyncExternalStore-style consumers: called after every change of the session. */
export const subscribe = (listener: () => void): (() => void) => sessionStore.subscribe(listener);
/** The session in a component; re-renders on sign-in and sign-out. */
export const useSession = (): Session | null => useStore(sessionStore, (s) => s.session);
