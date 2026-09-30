import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '@seats/frontend-shared';

/** The shell: app name, the signed-in LINE user, the navigation. Without an identity every screen goes to C1. */
export default function App() {
  const session = useSession();
  const location = useLocation();
  if (!session && location.pathname !== '/login') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return (
    <>
      <header className="app-header">
        <div className="brand"><strong>SEATS</strong><span>Customer Web App</span></div>
        <nav>
          <NavLink to="/" end>Concert rounds</NavLink>
          <NavLink to="/my-bookings">My Bookings</NavLink>
        </nav>
        <div className="identity">
          {session ? <>LINE user <code>{session.userId}</code> <Link to="/login">change</Link></> : <span>not logged in</span>}
        </div>
      </header>
      <main className="page"><Outlet /></main>
      <footer className="build" title="the commit this build was made from">build {__BUILD__.sha} · {__BUILD__.at}</footer>
    </>
  );
}
