import { useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api, clearSession, describeError, type Role, SeatsLogo, toast, useSession } from '@seats/frontend-shared';
import { queryClient } from './query-client';

interface NavItem { to: string; label: string; roles: Role[] }
/** One sidebar item per screen, shown to the roles that may use it (Business parameters and Staff accounts share the settings screen). */
const NAV: NavItem[] = [
  { to: '/rounds', label: 'Concert rounds', roles: ['manager', 'owner'] },
  { to: '/zone-maps', label: 'Zone maps', roles: ['manager', 'owner'] },
  { to: '/live', label: 'Live view', roles: ['manager', 'owner', 'front_staff'] },
  { to: '/check-in', label: 'Check-in', roles: ['manager', 'front_staff'] },
  { to: '/settings#business-parameters', label: 'Business parameters', roles: ['manager', 'owner'] },
  { to: '/settings#staff-accounts', label: 'Staff accounts', roles: ['manager', 'owner'] },
];

/** The shell of every screen: the dark top bar with the wordmark and the signed-in account, the left sidebar with
 *  one item per screen, a divider and Sign out; on a phone the sidebar is a drawer behind the ☰ of the top bar.
 *  Every screen but the sign-in needs a session: without one the router goes to /sign-in. */
export function App() {
  const session = useSession();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!session && pathname !== '/sign-in') return <Navigate to="/sign-in" replace />;

  const signOut = async () => {
    try {
      await api.delete('/api/sessions/current');
      toast.success('Signed out');
    } catch (e) {
      toast.info(`Signed out on this device; the server did not record it: ${describeError(e)}`);
    }
    clearSession();
    queryClient.clear();
    navigate('/sign-in');
  };
  const item = ({ isActive }: { isActive: boolean }) => (isActive ? 'cur' : '');
  const close = () => setOpen(false);
  const items = session ? NAV.filter((n) => n.roles.includes(session.role)) : [];

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
            {items.map((n) => <NavLink key={n.to} to={n.to} className={item} onClick={close}>{n.label}</NavLink>)}
            <div className="sep" />
            <button type="button" onClick={() => void signOut()}>Sign out</button>
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
