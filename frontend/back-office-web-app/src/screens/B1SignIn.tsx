import { type FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, ErrorAlert, setSession, type StaffRole, type StaffSession, useAction } from '@seats/frontend-shared';

const ROLES: StaffRole[] = ['manager', 'front_staff', 'owner'];

/** B1 Sign-in (UC-08): username and password to POST /api/sessions; the answer becomes the session (x-user-id =
 *  the staff account id, x-role, the token as Bearer). When the Staff Account Service is not there (404, 501, 502)
 *  a dev sign-in sets the session locally with a chosen role. */
export default function B1SignIn() {
  const navigate = useNavigate();
  const notice = (useLocation().state as { notice?: string } | null)?.notice;
  const action = useAction();
  const [username, setUsername] = useState('manager');
  const [password, setPassword] = useState('');
  const [dev, setDev] = useState(false);
  const [role, setRole] = useState<StaffRole>('manager');
  useEffect(() => { if (action.error && [404, 501, 502].includes(action.error.status)) setDev(true); }, [action.error]);

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    const s = await action.run(() => api.post<StaffSession>('/api/sessions', { username, password }));
    if (s?.role) {
      setSession({ userId: s.staffAccountId ?? username, role: s.role, token: s.token, label: username });
      navigate('/rounds');
    }
  };
  const devSignIn = () => {
    const id = username.trim() || role;
    setSession({ userId: id, role, label: `${id} (dev)` });
    navigate('/rounds');
  };

  return (
    <div className="signin-page">
      <h1>Sign in</h1>
      {notice && <div className="notice">{notice}</div>}
      <ErrorAlert error={action.error} onClose={action.clear} />
      <form className="card" onSubmit={signIn} style={{ maxWidth: 525 }}>
        <h2 style={{ margin: '0 0 4px' }}>Welcome back</h2>
        <p className="muted small" style={{ margin: '0 0 20px' }}>Manage your tables, concert rounds, and check-ins — all in one place.</p>
        <label className="field">Username<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus /></label>
        <label className="field">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
        <div className="row">
          <button type="submit" disabled={action.busy || !username.trim() || !password}>Sign in</button>
          {!dev && <button type="button" className="link" onClick={() => setDev(true)}>dev sign-in</button>}
        </div>
        <p className="small muted">Progress 1 seeds manager/manager, door1/door1 (front staff) and owner/owner.</p>
      </form>
      {dev && (
        <div className="card" style={{ maxWidth: 525 }}>
          <h4>Dev sign-in (no Staff Account Service)</h4>
          <p className="small muted">Sets the session locally: the username above becomes <code>x-user-id</code>, the role <code>x-role</code>.</p>
          <label className="field">Role
            <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select>
          </label>
          <button type="button" className="secondary" onClick={devSignIn}>Sign in locally as {role}</button>
        </div>
      )}
    </div>
  );
}
