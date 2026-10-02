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
        <div className="brand">
          <svg height="28" viewBox="150 230 1080 270" xmlns="http://www.w3.org/2000/svg" aria-label="SEATS">
            <g transform="translate(0,768) scale(0.1,-0.1)" fill="currentColor" stroke="none">
              <path d="M2558 5134 c-182 -33 -340 -114 -463 -238 -132 -132 -185 -258 -185 -436 0 -109 17 -188 60 -275 84 -173 231 -281 565 -414 72 -28 139 -60 151 -69 47 -39 48 -77 4 -117 -16 -14 -40 -20 -91 -23 -134 -8 -287 40 -429 133 -46 30 -86 51 -89 47 -3 -5 -68 -107 -145 -226 l-139 -218 44 -44 c122 -124 326 -228 549 -281 132 -30 406 -43 527 -23 408 65 685 336 685 670 0 173 -54 314 -165 428 -103 106 -209 168 -445 262 -164 65 -196 85 -200 128 -2 23 3 38 21 56 69 69 255 33 427 -84 35 -24 65 -38 69 -33 3 6 69 108 145 228 l140 218 -41 37 c-171 152 -364 244 -578 276 -113 17 -316 16 -417 -2z"/>
              <path d="M10080 5138 c-83 -12 -225 -59 -310 -104 -226 -118 -370 -340 -370 -569 0 -202 86 -374 249 -499 83 -64 151 -99 338 -176 221 -92 247 -111 224 -168 -8 -18 -27 -37 -46 -46 -42 -20 -150 -21 -235 0 -77 18 -225 87 -295 138 -39 28 -52 33 -61 23 -6 -6 -71 -106 -144 -221 -153 -241 -150 -221 -41 -310 168 -135 342 -208 601 -251 140 -24 411 -17 521 14 284 77 479 241 560 471 20 55 23 84 23 185 -1 152 -29 246 -104 353 -93 133 -239 228 -517 337 -179 70 -225 117 -172 174 40 42 100 51 201 30 73 -16 148 -50 225 -105 54 -37 68 -43 78 -32 6 7 72 107 145 223 101 159 130 213 123 225 -5 8 -43 43 -83 76 -133 113 -334 201 -520 229 -104 16 -289 18 -390 3z"/>
              <path d="M3700 4045 l0 -1065 1275 0 1275 0 5 23 c3 12 16 77 30 145 14 68 27 128 30 133 4 5 92 9 199 9 l194 0 28 -145 c16 -80 31 -150 34 -155 4 -7 167 -9 441 -8 l435 3 -122 420 c-68 231 -208 709 -311 1063 l-187 642 -513 0 -513 0 -9 -22 c-5 -13 -138 -466 -297 -1008 l-289 -985 -3 248 -2 247 -455 0 -455 0 0 75 0 75 395 0 395 0 0 305 0 305 -395 0 -395 0 0 75 0 75 425 0 425 0 0 305 0 305 -820 0 -820 0 0 -1065z m2904 -202 l14 -73 -107 0 -108 0 49 253 c27 138 52 259 55 267 5 13 37 -135 97 -447z"/>
              <path d="M7410 4760 l0 -350 290 0 290 0 0 -715 0 -715 390 0 390 0 0 715 0 715 290 0 290 0 0 350 0 350 -970 0 -970 0 0 -350z"/>
              <path d="M11130 3285 l0 -305 320 0 320 0 0 305 0 305 -320 0 -320 0 0 -305z"/>
            </g>
          </svg>
          <span>Back-office</span>
        </div>
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
      <footer className="build" title="the commit this build was made from">build {__BUILD__.sha} · {__BUILD__.at}</footer>
    </>
  );
}
