import { type FormEvent, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, type BusinessParameters, ErrorAlert, fmtDateTime, type StaffAccount, type StaffRole, useAction, useLoad, useSession } from '@seats/frontend-shared';
import { ROLE_NAME } from '../parts';

const ROLES: StaffRole[] = ['manager', 'front_staff', 'owner'];
const FIELDS: { key: keyof BusinessParameters; label: string; unit: string }[] = [
  { key: 'holdPeriodMinutes', label: 'Hold period', unit: 'min' },
  { key: 'checkInWindowHours', label: 'Check-in window', unit: 'h before the start' },
  { key: 'gracePeriodMinutes', label: 'Grace period', unit: 'min after the start' },
  { key: 'extraPersonFee', label: 'Extra-person fee', unit: 'THB per person' },
];
type ParamForm = Record<keyof BusinessParameters, string>;
const EMPTY: ParamForm = { holdPeriodMinutes: '', checkInWindowHours: '', gracePeriodMinutes: '', extraPersonFee: '' };

/** B7 Business parameters and staff accounts (UC-07; UC-08; Table D.16), the two cards of the wireframe side by
 *  side: the four parameters with Save; the staff accounts with Create account, a row selected by a click, Change
 *  role (and a new password) and Disable. The sidebar's "Business parameters" and "Staff accounts" both open this
 *  screen; the hash scrolls to the card. */
export default function B7BusinessParametersAndStaffAccounts() {
  const session = useSession();
  const hash = useLocation().hash;
  const params = useLoad(() => api.get<BusinessParameters>('/api/business-parameters'), []);
  const accounts = useLoad(() => api.get<StaffAccount[]>('/api/staff-accounts'), []);
  const action = useAction();
  const [form, setForm] = useState<ParamForm>(EMPTY);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [create, setCreate] = useState<{ username: string; role: StaffRole; password: string }>({ username: '', role: 'front_staff', password: '' });
  const [sel, setSel] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [edit, setEdit] = useState<{ role: StaffRole; password: string }>({ role: 'front_staff', password: '' });
  useEffect(() => {
    if (params.data) setForm({ holdPeriodMinutes: String(params.data.holdPeriodMinutes ?? ''), checkInWindowHours: String(params.data.checkInWindowHours ?? ''), gracePeriodMinutes: String(params.data.gracePeriodMinutes ?? ''), extraPersonFee: String(params.data.extraPersonFee ?? '') });
  }, [params.data]);
  useEffect(() => {
    const id = hash.replace(/^#/, '');
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, [hash]);

  const saveParams = async (e: FormEvent) => {
    e.preventDefault();
    const body: BusinessParameters = {};
    for (const f of FIELDS) if (form[f.key] !== '') body[f.key] = Number(form[f.key]);
    const saved = await action.run(() => api.put<BusinessParameters>('/api/business-parameters', body));
    if (saved) { params.setData(saved); setSavedAt(new Date().toISOString()); }
  };
  const createAccount = async (e: FormEvent) => {
    e.preventDefault();
    const r = await action.run(() => api.post<StaffAccount>('/api/staff-accounts', create));
    if (r) { setCreate({ username: '', role: 'front_staff', password: '' }); setCreating(false); accounts.reload(); }
  };
  const select = (a: StaffAccount) => {
    setSel(a.staffAccountId ?? null);
    setChanging(false);
    setEdit({ role: a.role ?? 'front_staff', password: '' });
  };
  const saveRole = async (e: FormEvent) => {
    e.preventDefault();
    const r = await action.run(() => api.put<StaffAccount>(`/api/staff-accounts/${sel}`, { role: edit.role, password: edit.password || undefined }));
    if (r) { setChanging(false); setEdit({ ...edit, password: '' }); accounts.reload(); }
  };
  const disable = async () => {
    if (!window.confirm('Disable this account? It can no longer sign in.')) return;
    const r = await action.run(() => api.delete<StaffAccount>(`/api/staff-accounts/${sel}`));
    if (r) accounts.reload();
  };
  const cur = accounts.data?.find((a) => a.staffAccountId === sel);

  return (
    <>
      <ErrorAlert error={action.error} onClose={action.clear} />
      <div className="cols">
        <form className="panel" id="business-parameters" onSubmit={saveParams} style={{ width: 380, flex: 'none', maxWidth: '100%' }} data-testid="business-parameters">
          <div className="pt">Business parameters</div>
          <ErrorAlert error={params.error} />
          {FIELDS.map((f) => (
            <div key={f.key} className="frow">
              <label className="fl" htmlFor={`bp-${f.key}`}>{f.label}</label>
              <input id={`bp-${f.key}`} type="number" min={0} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} disabled={!params.data} />
              <span className="unit">{f.unit}</span>
            </div>
          ))}
          <div className="btnrow">
            <button type="submit" className="primary" disabled={action.busy || !params.data}>Save</button>
            {savedAt && <span className="tiny">Last saved {fmtDateTime(savedAt)} by {session?.label ?? session?.userId}</span>}
          </div>
          <div className="tiny" style={{ marginTop: 8 }}>
            The hold period bounds every new hold; the check-in window and the grace period are derived for each round from these values; the extra-person fee is charged per person above the capacity of the table type. A Published round keeps the values snapshotted at its publish (FR-38).
          </div>
        </form>

        <div className="panel grow" id="staff-accounts" data-testid="staff-accounts">
          <div className="row" style={{ marginBottom: 6 }}>
            <span className="pt" style={{ margin: 0 }}>Staff accounts</span>
            <button type="button" className="small" onClick={() => setCreating(!creating)} aria-expanded={creating}>+ Create account</button>
          </div>
          <ErrorAlert error={accounts.error} />
          {creating && (
            <form className="frow" onSubmit={createAccount} style={{ marginBottom: 8, flexWrap: 'wrap' }}>
              <input value={create.username} onChange={(e) => setCreate({ ...create, username: e.target.value })} placeholder="username" aria-label="username" autoComplete="off" style={{ flex: '1 1 110px' }} />
              <select value={create.role} onChange={(e) => setCreate({ ...create, role: e.target.value as StaffRole })} aria-label="role" style={{ flex: '0 1 120px' }}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_NAME[r]}</option>)}</select>
              <input type="password" value={create.password} onChange={(e) => setCreate({ ...create, password: e.target.value })} placeholder="password" aria-label="password" autoComplete="new-password" style={{ flex: '1 1 110px' }} />
              <button type="submit" className="small primary" disabled={action.busy || !create.username.trim() || !create.password}>Create</button>
            </form>
          )}
          <table className="tbl clickable">
            <thead><tr><th style={{ width: 90 }}>Username</th><th>Role</th><th style={{ width: 72 }}>Status</th><th style={{ width: 96 }}>Last sign-in</th></tr></thead>
            <tbody>
              {accounts.data?.map((a) => (
                <tr key={a.staffAccountId} className={a.staffAccountId === sel ? 'sel' : ''} onClick={() => select(a)} aria-selected={a.staffAccountId === sel}>
                  <td>{a.username}</td>
                  <td>{a.role ? ROLE_NAME[a.role] : '–'}</td>
                  <td>{a.status}</td>
                  <td>–</td>
                </tr>
              ))}
              {accounts.data?.length === 0 && <tr><td colSpan={4} className="tiny">No staff account yet.</td></tr>}
            </tbody>
          </table>
          <div className="btnrow">
            <span className="tiny">{cur ? `Selected: ${cur.username}` : 'Select an account in the table.'}</span>
            <button type="button" onClick={() => setChanging(!changing)} disabled={!cur || cur.status === 'Disabled'} aria-expanded={changing}>Change role</button>
            <button type="button" onClick={disable} disabled={!cur || cur.status === 'Disabled' || action.busy} title={cur?.status === 'Disabled' ? 'already disabled; re-enabling an account has no route in progress 1' : undefined}>Disable</button>
          </div>
          {changing && cur && (
            <form className="frow" onSubmit={saveRole} style={{ flexWrap: 'wrap' }}>
              <label className="fl" htmlFor="sa-role">Role of {cur.username}</label>
              <select id="sa-role" value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as StaffRole })} style={{ flex: '0 1 140px' }}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_NAME[r]}</option>)}</select>
              <input type="password" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} placeholder="new password (optional)" aria-label="new password" autoComplete="new-password" style={{ flex: '1 1 140px' }} />
              <button type="submit" className="small primary" disabled={action.busy}>Save</button>
            </form>
          )}
          <div className="tiny" style={{ marginTop: 8 }}>A disabled account can no longer sign in; its past check-ins keep its name.</div>
        </div>
      </div>
    </>
  );
}
