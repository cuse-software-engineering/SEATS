import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearSession, SeatsLogo, useSession } from '@seats/frontend-shared';

/** The app bar of every screen (Appendix D): a back chevron, the bold title, a right slot (the hold countdown on
 *  C4 to C7) and, once logged in, the ⋮ menu with the two screens LINE's rich menu would open and Log out; then the
 *  content column. */
export function Screen({ title, back, right, children, padTop }: { title: ReactNode; back?: string; right?: ReactNode; children: ReactNode; padTop?: number }) {
  const session = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!menu.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const logOut = () => { setOpen(false); clearSession(); navigate('/login'); };
  return (
    <>
      <header className="appbar">
        {back && <Link to={back} className="back" aria-label="Back">‹</Link>}
        <SeatsLogo className="logo" height={14} />
        <h1>{title}</h1>
        <span className="right">{right}</span>
        {session && (
          <div className="menu" ref={menu}>
            <button type="button" className="more" aria-label="Menu" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>⋮</button>
            {open && (
              <div className="menu-list" role="menu">
                <Link to="/" role="menuitem" onClick={() => setOpen(false)}>Concert rounds</Link>
                <Link to="/my-bookings" role="menuitem" onClick={() => setOpen(false)}>My bookings</Link>
                <button type="button" role="menuitem" onClick={logOut}>Log out<span className="tiny">{session.userId}</span></button>
              </div>
            )}
          </div>
        )}
      </header>
      <div className="content" style={padTop !== undefined ? { paddingTop: padTop } : undefined}>{children}</div>
    </>
  );
}
