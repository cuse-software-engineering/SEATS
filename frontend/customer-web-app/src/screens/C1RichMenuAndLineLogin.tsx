import { type FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { setSession, useSession } from '@seats/frontend-shared';
import { VENUE } from '../venue';

const DEMO_USER = 'U-demo';

/** C1 Rich Menu and LINE Login (UC-01 steps 1–2): the LINE chat of the venue's Official Account with its rich menu,
 *  and the LINE Login dialog over it. LINE Login is stubbed in progress 1: the dialog takes a LINE user id (a fixed
 *  demo id when left empty), kept in this browser and sent as x-user-id on every call; the ID token of ADR-01
 *  replaces it later. */
export default function C1RichMenuAndLineLogin() {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [userId, setUserId] = useState('');
  if (session) return <Navigate to="/" replace />;

  const allow = (e: FormEvent) => {
    e.preventDefault();
    setSession({ userId: userId.trim() || DEMO_USER, role: 'customer' });
    navigate(from && from !== '/login' ? from : '/');
  };

  return (
    <div className="line-chat">
      <header className="appbar">
        <span className="back" aria-hidden="true">‹</span>
        <img className="avatar" src={VENUE.logoUrl} alt="" />
        <h1>{VENUE.name}</h1>
        <span className="tiny">Official Account</span>
      </header>
      <div className="chat" aria-hidden="true">
        <div className="bubble">Booking for <b>Sat 26 Sep 2026 · 20:00</b> (Artist name) is open now. Tap <b>Reserve a table</b> below.</div>
        <div className="bubble me">Hi, is a 4-person table still free?</div>
        <div className="bubble">Please use the menu below: the map shows what is free right now and your table is held while you pay.</div>
      </div>
      <div className="richmenu" aria-hidden="true">
        <div className="hi">Reserve a table</div>
        <div>My bookings</div>
        <div>Contact us</div>
        <div>Booking terms</div>
      </div>
      <div className="modal-bg" />
      <form className="modal" role="dialog" aria-labelledby="line-login-title" onSubmit={allow}>
        <h2 id="line-login-title">LINE Login</h2>
        <div className="muted" style={{ margin: '4px 0 8px' }}>SEATS Booking ({VENUE.name}) wants to use:</div>
        <div>• your LINE profile name<br />• your LINE user ID</div>
        <div className="tiny" style={{ marginTop: 6 }}>No separate registration: one LINE account is one customer.</div>
        <label className="label" htmlFor="line-user-id">LINE user id</label>
        <input id="line-user-id" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder={`${DEMO_USER} (stub, progress 1)`} autoFocus autoComplete="off" />
        <button type="submit" className="btn primary line small">Allow</button>
        <button type="button" className="btn secondary small" onClick={() => setUserId('')}>Cancel</button>
      </form>
    </div>
  );
}
