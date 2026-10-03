import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Button, describeError, Field, SeatsLogo, setSession, type StaffSession, TextInput, toApiError, toast } from '@seats/frontend-shared';
import { capitalize } from '../../app/format';
import { landingOf } from '../../app/landing';

/** Username and password to POST /api/sessions; the answer becomes the session (the staff account id, the role,
 *  the token). A refusal is said under the field it concerns and as a toast, in the gateway's own words. */
export function SignInForm() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field: 'username' | 'password'; text: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = username.trim();
    setBusy(true);
    setError(null);
    try {
      const s = await api.post<StaffSession>('/api/sessions', { username: name, password });
      if (!s.role) throw new Error('the answer names no role');
      setSession({ userId: s.staffAccountId ?? name, role: s.role, token: s.token, label: name });
      toast.success(`Signed in as ${name}`);
      navigate(landingOf(s.role));
    } catch (err) {
      const a = toApiError(err);
      // 401 carries the staff service's reason (wrong username or password, the account is disabled); the rest is said in general words
      const reason = a.status === 401 ? a.error : describeError(a);
      setError({ field: /disabled/i.test(reason) ? 'username' : 'password', text: capitalize(reason) });
      toast.error(`Could not sign in: ${reason}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="signin" onSubmit={(e) => void submit(e)}>
      <h1 className="title"><SeatsLogo className="logo" height={22} /> back-office</h1>
      <div className="muted" style={{ marginBottom: 8 }}>Sign in with your staff account</div>
      <Field label="Username" error={error?.field === 'username' ? error.text : null}>
        {(id, invalid) => <TextInput id={id} invalid={invalid} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />}
      </Field>
      <Field label="Password" error={error?.field === 'password' ? error.text : null}>
        {(id, invalid) => <TextInput id={id} invalid={invalid} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />}
      </Field>
      <Button type="submit" variant="primary" block busy={busy} disabled={!username.trim() || !password}>Sign in</Button>
      <div className="tiny" style={{ marginTop: 12 }}>Staff accounts are issued by the Manager. Your role decides which screens open.</div>
    </form>
  );
}
