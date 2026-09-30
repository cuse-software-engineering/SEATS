import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api, clearSession, toApiError, useSession } from '@seats/frontend-shared';

/** The shell: app name, the signed-in staff account and role, the navigation, Sign out (UC-08). Every screen but
 *  B1 needs a session (FR-66): without one the router goes to /sign-in. */
export default function App() {
  const session = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  if (!session && location.pathname !== '/sign-in') return <Navigate to="/sign-in" replace />;

  const signOut = async () => {
    let notice: string | undefined;
    try { await api.delete('/api/sessions/current'); } catch (e) { notice = `Signed out locally; the sign-out call failed: ${toApiError(e).error}`; }
    clearSession();
    navigate('/sign-in', { state: { notice } });
  };

  return (
    <>
      <header className="app-header">
        <div className="brand"><strong>SEATS</strong><span>Back-office</span></div>
        {session && (
          <nav>
            <NavLink to="/zone-maps">Zone maps</NavLink>
            <NavLink to="/rounds">Rounds</NavLink>
            <NavLink to="/live">Live view</NavLink>
            <NavLink to="/check-in">Check-in</NavLink>
            <NavLink to="/settings">Settings</NavLink>
          </nav>
        )}
        <div className="identity">
          {session ? <><strong>{session.label ?? session.userId}</strong> · {session.role} <button type="button" className="link" onClick={signOut}>Sign out</button></> : <span>not signed in</span>}
        </div>
      </header>
      <main className="page"><Outlet /></main>
    </>
  );
}
