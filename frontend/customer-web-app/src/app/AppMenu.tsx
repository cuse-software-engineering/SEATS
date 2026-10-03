import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearSession, toast, useSession } from '@seats/frontend-shared';
import { markLogOut } from './logout';
import { paths } from './paths';

/** The ⋮ menu of the app bar, once logged in: the two screens LINE's rich menu would open, and Log out. */
export function AppMenu() {
  const session = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (e: MouseEvent) => { if (!menu.current?.contains(e.target as Node)) setOpen(false); };
    const closeOnEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('mousedown', closeOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, [open]);
  if (!session) return null;

  const logOut = () => {
    setOpen(false);
    markLogOut();   // the next login starts at the concert rounds, not on the screen just left
    clearSession();
    toast.info('Logged out');
    navigate(paths.login, { replace: true });
  };
  return (
    <div className="menu" ref={menu}>
      <button type="button" className="more" aria-label="Menu" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>⋮</button>
      {open && (
        <div className="menu-list" role="menu">
          <Link to={paths.rounds} role="menuitem" onClick={() => setOpen(false)}>Concert rounds</Link>
          <Link to={paths.myBookings} role="menuitem" onClick={() => setOpen(false)}>My bookings</Link>
          <button type="button" role="menuitem" onClick={logOut}>Log out<span className="tiny">{session.userId}</span></button>
        </div>
      )}
    </div>
  );
}
