import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '@seats/frontend-shared';
import { consumeLogOut } from './logout';
import { paths } from './paths';

/** The shell: the LIFF page inside LINE, a phone-width column. Without an identity every screen goes to the login,
 *  which comes back here once the customer has allowed it (not after a deliberate Log out: then the login starts at
 *  the concert rounds). Log out is in the ⋮ menu of the app bar (AppMenu); the footer names the signed-in LINE user
 *  and the build. */
export function App() {
  const session = useSession();
  const location = useLocation();
  if (!session && location.pathname !== paths.login) {
    const from = consumeLogOut() ? null : { from: `${location.pathname}${location.search}` };
    return <Navigate to={paths.login} replace state={from} />;
  }
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
