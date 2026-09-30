import { type FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearSession, setSession, useSession } from '@seats/frontend-shared';

/** C1 Rich Menu and LINE Login (UC-01 steps 1–2). LINE Login is stubbed in progress 1: the LINE user id is typed
 *  once and sent as x-user-id on every call; the ID token of ADR-01 replaces it later. */
export default function C1RichMenuAndLineLogin() {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [userId, setUserId] = useState(session?.userId ?? '');
  const [dialog, setDialog] = useState(false);

  const login = (e: FormEvent) => {
    e.preventDefault();
    const id = userId.trim();
    if (!id) return;
    setSession({ userId: id, role: 'customer' });
    navigate(from && from !== '/login' ? from : '/');
  };

  return (
    <>
      <h1>LINE</h1>
      <div className="card">
        <h4>Rich Menu</h4>
        <p className="muted small">The chat of the venue's LINE Official Account; the Rich Menu opens the LIFF app (ADR-01).</p>
        <button type="button" className="menu-tile" onClick={() => setDialog(true)}>Reserve a table</button>
      </div>
      {(dialog || !session) && (
        <form className="card" onSubmit={login}>
          <h4>LINE Login (stub, progress 1)</h4>
          <p className="small muted">No LINE Login yet: type a LINE user id, it is kept in this browser and sent as <code>x-user-id</code> with the role <code>customer</code>.</p>
          <label className="field">LINE user id
            <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="U-somchai" autoFocus />
          </label>
          <div className="row">
            <button type="submit" disabled={!userId.trim()}>Log in with LINE</button>
            {session && <button type="button" className="secondary" onClick={() => { clearSession(); setUserId(''); }}>Log out</button>}
          </div>
        </form>
      )}
    </>
  );
}
