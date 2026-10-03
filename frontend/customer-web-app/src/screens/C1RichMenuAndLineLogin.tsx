import { type FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { setSession, useSession } from '@seats/frontend-shared';
import { VENUE } from '../venue';

/** C1 LINE Login (UC-01 steps 1–2). LINE Login is stubbed in progress 1: the LINE user id is typed once and sent
 *  as x-user-id on every call; the ID token of ADR-01 replaces it later. */
export default function C1RichMenuAndLineLogin() {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [userId, setUserId] = useState(session?.userId ?? '');
  if (session) return <Navigate to="/" replace />;

  const loginAs = (id: string) => {
    setSession({ userId: id, role: 'customer' });
    navigate(from && from !== '/login' ? from : '/');
  };
  const loginWithId = (e: FormEvent) => { e.preventDefault(); const id = userId.trim(); if (id) loginAs(id); };
  const loginWithLine = () => loginAs('U-demo');

  return (
    <div className="login-page">
      <h1>Sign in</h1>
      <div className="card">
        <div className="venue">
          <img src={VENUE.logoUrl} alt={VENUE.name} className="venue-logo" />
          <div>
            <div className="venue-name">{VENUE.name}</div>
            <div className="venue-tagline">{VENUE.tagline}</div>
          </div>
        </div>
        <h2 style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 700 }}>Welcome</h2>
        <p className="muted small" style={{ margin: '0 0 20px' }}>Reserve your table for the next concert round — all through LINE.</p>
        <h4>LINE Login (stub, progress 1)</h4>
        <p className="small muted">No LINE Login yet: type a LINE user id, it is kept in this browser and sent as <code>x-user-id</code> with the role <code>customer</code>.</p>
        <form onSubmit={loginWithId}>
          <label className="field">LINE user id
            <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="U-somchai" autoFocus />
          </label>
          <button type="submit" disabled={!userId.trim()} style={{ width: '100%' }}>Continue</button>
        </form>
        <div className="or-divider"><span>or</span></div>
        <button type="button" className="line-btn" onClick={loginWithLine}>
          <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
            <path fill="#fff" d="M16 3C8.27 3 2 7.98 2 14.12c0 5.51 5.07 10.12 11.92 10.98.46.1 1.09.3 1.25.7.14.36.09.92.05 1.28l-.2 1.21c-.06.36-.28 1.4 1.23.76 1.52-.64 8.17-4.81 11.14-8.23 2.05-2.25 3.03-4.54 3.03-7.0C30.42 7.98 24.15 3 16 3z"/>
            <text x="16" y="17" textAnchor="middle" fontSize="7" fontWeight="800" fontFamily="Arial, sans-serif" fill="#06C755" letterSpacing="0.2">LINE</text>
          </svg>
          Log in with LINE
        </button>
      </div>
    </div>
  );
}
