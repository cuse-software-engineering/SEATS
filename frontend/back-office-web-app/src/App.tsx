import { useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api, clearSession, SeatsLogo, toApiError, useSession } from '@seats/frontend-shared';

/** The shell of every screen, as the wireframes of Appendix D draw it: the dark top bar with the app name and the
 *  signed-in account, the left sidebar with one item per screen (Business parameters and Staff accounts both open
 *  B7 and are both highlighted there), a divider and Sign out (UC-08). On a phone (the front staff's, B5 and B6)
 *  the sidebar is a drawer behind the ☰ of the top bar. Every screen but B1 needs a session (FR-66): without one
 *  the router goes to /sign-in. */
export default function App() {
  const session = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!session && location.pathname !== '/sign-in') return <Navigate to="/sign-in" replace />;

  const signOut = async () => {
    let notice: string | undefined;
    try { await api.delete('/api/sessions/current'); } catch (e) { notice = `Signed out locally; the sign-out call failed: ${toApiError(e).error}`; }
    clearSession();
    navigate('/sign-in', { state: { notice } });
  };
  const item = ({ isActive }: { isActive: boolean }) => (isActive ? 'cur' : '');
  const close = () => setOpen(false);

  return (
    <>
      <header className="topbar">
        {session && <button type="button" className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>☰</button>}
        <span className="brand"><SeatsLogo className="logo" height={18} /> back-office</span>
        <span className="who identity" title={session ? `role ${session.role}` : undefined}>
          {session ? `signed in as ${session.label ?? session.userId}` : 'not signed in'}
        </span>
      </header>
      <div className="wbody">
        {session && (
          <nav className={`nav${open ? ' open' : ''}`} aria-label="screens">
            <NavLink to="/rounds" className={item} onClick={close}>Concert rounds</NavLink>
            <NavLink to="/zone-maps" className={item} onClick={close}>Zone maps</NavLink>
            <NavLink to="/live" className={item} onClick={close}>Live view</NavLink>
            <NavLink to="/check-in" className={item} onClick={close}>Check-in</NavLink>
            <NavLink to="/settings#business-parameters" className={item} onClick={close}>Business parameters</NavLink>
            <NavLink to="/settings#staff-accounts" className={item} onClick={close}>Staff accounts</NavLink>
            <div className="sep" />
            <button type="button" onClick={signOut}>Sign out</button>
          </nav>
        )}
        {open && <div className="nav-bg" onClick={close} />}
        <main className="main">
          <Outlet />
          <footer className="build" title="the commit this build was made from">build {__BUILD__.sha} · {__BUILD__.at}</footer>
        </main>
      </div>
    </>
  );
}
