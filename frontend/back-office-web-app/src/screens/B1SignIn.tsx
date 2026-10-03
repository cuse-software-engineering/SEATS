import { type FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, ErrorAlert, SeatsLogo, setSession, type StaffRole, type StaffSession, useAction } from '@seats/frontend-shared';

const ROLES: StaffRole[] = ['manager', 'front_staff', 'owner'];

/** B1 Sign-in (UC-08, Table D.10): the centered card with username and password to POST /api/sessions; the answer
 *  becomes the session (x-user-id = the staff account id, x-role, the token as Bearer). When the Staff Account
 *  Service is not there (404, 501, 502) a dev sign-in, tucked under the card, sets the session locally. */
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
      <form className="signin" onSubmit={signIn}>
        <h1 className="title"><SeatsLogo className="logo" height={22} /> back-office</h1>
        <div className="muted" style={{ marginBottom: 12 }}>Sign in with your staff account</div>
        {notice && <div className="notice">{notice}</div>}
        <ErrorAlert error={action.error} onClose={action.clear} />
        <label className="label" htmlFor="username">Username</label>
        <input id="username" className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />
        <label className="label" htmlFor="password">Password</label>
        <input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <button type="submit" className="primary wide" disabled={action.busy || !username.trim() || !password}>Sign in</button>
        <div className="tiny" style={{ marginTop: 12 }}>Staff accounts are issued by the Manager. Your role decides which screens open.</div>
      </form>
      <div className="tiny dev-link">
        Progress 1 seeds manager/manager, door1/door1 (front staff) and owner/owner.
        {!dev && <> <button type="button" className="link" onClick={() => setDev(true)}>dev sign-in</button></>}
      </div>
      {dev && (
        <div className="panel dev">
          <div className="pt">Dev sign-in (no Staff Account Service)</div>
          <div className="tiny">Sets the session locally: the username above becomes <code>x-user-id</code>, the role <code>x-role</code>.</div>
          <div className="frow" style={{ marginTop: 6 }}>
            <label className="fl" htmlFor="dev-role">Role</label>
            <select id="dev-role" value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select>
          </div>
          <div className="btnrow"><button type="button" className="small" onClick={devSignIn}>Sign in locally as {role}</button></div>
        </div>
      )}
    </div>
  );
}
