import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '@seats/frontend-shared';
import { VENUE } from './venue';

/** The shell: the LIFF page inside LINE, a phone-width column (Appendix D). Without an identity every screen goes
 *  to C1. Log out is in the ⋮ menu of the app bar (Screen.tsx); the footer names the signed-in LINE user. */
export default function App() {
  const session = useSession();
  const location = useLocation();
  useEffect(() => { document.title = `${VENUE.name} · SEATS Booking`; }, []);
  if (!session && location.pathname !== '/login') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return (
    <div className="phone">
      <Outlet />
      <footer className="build" title="the commit this build was made from">
        build {__BUILD__.sha} · {__BUILD__.at}
        {session && <> · logged in as <span className="identity">{session.userId}</span></>}
      </footer>
    </div>
  );
}
