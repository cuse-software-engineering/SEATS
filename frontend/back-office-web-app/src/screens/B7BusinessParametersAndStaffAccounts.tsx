import { type FormEvent, useEffect, useState } from 'react';
import { api, Badge, type BusinessParameters, ErrorAlert, type StaffAccount, type StaffRole, useAction, useLoad } from '@seats/frontend-shared';

const ROLES: StaffRole[] = ['manager', 'front_staff', 'owner'];
const FIELDS: { key: keyof BusinessParameters; label: string }[] = [
  { key: 'holdPeriodMinutes', label: 'Hold period, minutes (BRULE-02)' },
  { key: 'checkInWindowHours', label: 'Check-in window, hours (BRULE-04)' },
  { key: 'gracePeriodMinutes', label: 'Grace period, minutes (BRULE-05)' },
  { key: 'extraPersonFee', label: 'Extra-person fee, THB (BRULE-09)' },
];

/** B7 Business parameters and staff accounts (UC-07; UC-08): the four parameters; the staff accounts with role,
 *  create, change the role or the password, disable. */
export default function B7BusinessParametersAndStaffAccounts() {
  const params = useLoad(() => api.get<BusinessParameters>('/api/business-parameters'), []);
  const accounts = useLoad(() => api.get<StaffAccount[]>('/api/staff-accounts'), []);
  const action = useAction();
  const [form, setForm] = useState<Record<keyof BusinessParameters, string>>({ holdPeriodMinutes: '', checkInWindowHours: '', gracePeriodMinutes: '', extraPersonFee: '' });
  const [create, setCreate] = useState<{ username: string; role: StaffRole; password: string }>({ username: '', role: 'front_staff', password: '' });
  const [edits, setEdits] = useState<Record<string, { role?: StaffRole; password?: string }>>({});
  useEffect(() => {
    if (params.data) setForm({ holdPeriodMinutes: String(params.data.holdPeriodMinutes ?? ''), checkInWindowHours: String(params.data.checkInWindowHours ?? ''), gracePeriodMinutes: String(params.data.gracePeriodMinutes ?? ''), extraPersonFee: String(params.data.extraPersonFee ?? '') });
  }, [params.data]);

  const saveParams = async (e: FormEvent) => {
    e.preventDefault();
    const body: BusinessParameters = {};
    for (const f of FIELDS) if (form[f.key] !== '') body[f.key] = Number(form[f.key]);
    const saved = await action.run(() => api.put<BusinessParameters>('/api/business-parameters', body));
    if (saved) params.setData(saved);
  };
  const createAccount = async (e: FormEvent) => {
    e.preventDefault();
    const r = await action.run(() => api.post<StaffAccount>('/api/staff-accounts', create));
    if (r) { setCreate({ username: '', role: 'front_staff', password: '' }); accounts.reload(); }
  };
  const update = async (id: string) => {
    const edit = edits[id] ?? {};
    const r = await action.run(() => api.put<StaffAccount>(`/api/staff-accounts/${id}`, { role: edit.role, password: edit.password || undefined }));
    if (r) { setEdits((e) => ({ ...e, [id]: {} })); accounts.reload(); }
  };
  const disable = async (id: string) => {
    if (!window.confirm('Disable this account? It can no longer sign in.')) return;
    const r = await action.run(() => api.delete<StaffAccount>(`/api/staff-accounts/${id}`));
    if (r) accounts.reload();
  };

  return (
    <>
      <h1>Settings</h1>
      <ErrorAlert error={params.error} />
      <ErrorAlert error={action.error} onClose={action.clear} />
      <form className="card" onSubmit={saveParams} style={{ maxWidth: 520 }}>
        <h4>Business parameters (UC-07)</h4>
        {FIELDS.map((f) => (
          <label key={f.key} className="field">{f.label}<input type="number" min={0} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} /></label>
        ))}
        <button type="submit" disabled={action.busy || !params.data}>Save parameters</button>
        <p className="small muted">A Published round keeps the values snapshotted at its publish (FR-38).</p>
      </form>

      <div className="card">
        <h4>Staff accounts (UC-08)</h4>
        <ErrorAlert error={accounts.error} />
        {accounts.data && (
          <table className="data">
            <thead><tr><th>Username</th><th>Role</th><th>Status</th><th>New password</th><th></th></tr></thead>
            <tbody>
              {accounts.data.map((a) => {
                const id = a.staffAccountId ?? '';
                const edit = edits[id] ?? {};
                return (
                  <tr key={id}>
                    <td><strong>{a.username}</strong><div className="small muted"><code>{id}</code></div></td>
                    <td><select value={edit.role ?? a.role ?? ''} onChange={(e) => setEdits({ ...edits, [id]: { ...edit, role: e.target.value as StaffRole } })} disabled={a.status === 'Disabled'}>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select></td>
                    <td><Badge solid={a.status === 'Active'}>{a.status}</Badge></td>
                    <td><input type="password" value={edit.password ?? ''} onChange={(e) => setEdits({ ...edits, [id]: { ...edit, password: e.target.value } })} placeholder="leave empty to keep" disabled={a.status === 'Disabled'} /></td>
                    <td className="tight">
                      <button type="button" className="secondary" onClick={() => update(id)} disabled={action.busy || a.status === 'Disabled' || (!edit.role && !edit.password)}>Save</button>{' '}
                      <button type="button" className="link" onClick={() => disable(id)} disabled={action.busy || a.status === 'Disabled'}>disable</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <form className="row" onSubmit={createAccount}>
          <input value={create.username} onChange={(e) => setCreate({ ...create, username: e.target.value })} placeholder="username" autoComplete="off" />
          <select value={create.role} onChange={(e) => setCreate({ ...create, role: e.target.value as StaffRole })}>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select>
          <input type="password" value={create.password} onChange={(e) => setCreate({ ...create, password: e.target.value })} placeholder="password" autoComplete="new-password" />
          <button type="submit" disabled={action.busy || !create.username.trim() || !create.password}>Create account</button>
        </form>
      </div>
    </>
  );
}
