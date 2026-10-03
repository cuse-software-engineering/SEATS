import { type FormEvent, useState } from 'react';
import {
  api, Button, Card, confirm, DataTable, Field, LoadError, Loading, Select, type StaffAccount, type StaffAccountCreate, type StaffAccountUpdate, type StaffRole, TextInput,
  useMutate, useSession,
} from '@seats/frontend-shared';
import { ROLE_NAME } from '../../app/format';
import { keys, useStaffAccounts } from '../../app/queries';

const ROLES: StaffRole[] = ['manager', 'front_staff', 'owner'];
const passwordProblem = (p: string): string | null => (p && p.length < 4 ? 'At least 4 characters' : null);

/** The staff accounts: Create account, a row selected by a click, Change role (and a new password), Disable.
 *  The signed-in account cannot disable itself. */
export function StaffAccountsPanel({ canEdit }: { canEdit: boolean }) {
  const session = useSession();
  const accounts = useStaffAccounts();
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<StaffAccountCreate>({ username: '', role: 'front_staff', password: '' });
  const [sel, setSel] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [change, setChange] = useState<{ role: StaffRole; password: string }>({ role: 'front_staff', password: '' });

  const create = useMutate((input: StaffAccountCreate) => api.post<StaffAccount>('/api/staff-accounts', input), {
    success: (a) => `Account ${a.username} created`, failure: 'Could not create the account', invalidate: [keys.staffAccounts],
    onSuccess: (a) => { setDraft({ username: '', role: 'front_staff', password: '' }); setCreating(false); setSel(a.staffAccountId ?? null); },
  });
  const update = useMutate((input: { id: string; body: StaffAccountUpdate }) => api.put<StaffAccount>(`/api/staff-accounts/${input.id}`, input.body), {
    success: (a, input) => `Role of ${a.username} changed to ${ROLE_NAME[a.role ?? 'front_staff']}${input.body.password ? ', new password set' : ''}`,
    failure: 'Could not change the account', invalidate: [keys.staffAccounts], onSuccess: () => { setChanging(false); setChange((c) => ({ ...c, password: '' })); },
  });
  const disable = useMutate((id: string) => api.delete<StaffAccount>(`/api/staff-accounts/${id}`), {
    success: (a) => `Account ${a.username} disabled`, failure: 'Could not disable the account', invalidate: [keys.staffAccounts],
  });

  const cur = accounts.data?.find((a) => a.staffAccountId === sel);
  const self = Boolean(cur && cur.staffAccountId === session?.userId);
  const select = (a: StaffAccount) => { setSel(a.staffAccountId ?? null); setChanging(false); setChange({ role: a.role ?? 'front_staff', password: '' }); };
  const askDisable = async () => {
    if (!cur?.staffAccountId) return;
    if (await confirm({ title: `Disable ${cur.username}?`, message: 'The account can no longer sign in; its past check-ins keep its name.', confirmLabel: 'Disable', danger: true })) disable.mutate(cur.staffAccountId);
  };
  const submitCreate = (e: FormEvent) => { e.preventDefault(); if (draft.username.trim() && !passwordProblem(draft.password) && draft.password) create.mutate({ ...draft, username: draft.username.trim() }); };
  const submitChange = (e: FormEvent) => { e.preventDefault(); if (cur?.staffAccountId && !passwordProblem(change.password)) update.mutate({ id: cur.staffAccountId, body: { role: change.role, password: change.password || undefined } }); };

  return (
    <Card title="Staff accounts" className="staff-accounts" id="staff-accounts" data-testid="staff-accounts"
      actions={<Button size="sm" onClick={() => setCreating((c) => !c)} aria-expanded={creating} disabled={!canEdit}>+ Create account</Button>}>
      {creating && (
        <form className="create-account" onSubmit={submitCreate}>
          <Field label="Username">{(id) => <TextInput id={id} value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} autoComplete="off" autoFocus />}</Field>
          <Field label="Role">{(id) => <Select id={id} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as StaffRole })}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_NAME[r]}</option>)}</Select>}</Field>
          <Field label="Password" error={passwordProblem(draft.password)}>{(id, invalid) => <TextInput id={id} invalid={invalid} type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} autoComplete="new-password" />}</Field>
          <div className="btnrow">
            <Button type="submit" variant="primary" size="sm" disabled={!draft.username.trim() || !draft.password || Boolean(passwordProblem(draft.password))} busy={create.isPending}>Create</Button>
            <Button variant="link" size="sm" onClick={() => setCreating(false)}>cancel</Button>
          </div>
        </form>
      )}
      {accounts.isLoading && <Loading what="Loading the accounts" />}
      {accounts.isError && <LoadError error={accounts.error} retry={() => void accounts.refetch()} what="load the accounts" />}
      {accounts.data && (
        <DataTable<StaffAccount> testId="accounts" rows={accounts.data} rowKey={(a) => a.staffAccountId ?? ''} selectedKey={sel ?? undefined} onRowClick={select} empty="No staff account yet."
          columns={[
            { key: 'username', header: 'Username', width: '110px', cell: (a) => a.username },
            { key: 'role', header: 'Role', cell: (a) => (a.role ? ROLE_NAME[a.role] : '–') },
            { key: 'status', header: 'Status', width: '80px', cell: (a) => a.status },
          ]} />
      )}
      <div className="btnrow">
        <span className="tiny">{cur ? `Selected: ${cur.username}${self ? ' (you)' : ''}` : 'Select an account in the table.'}</span>
        <Button onClick={() => setChanging((c) => !c)} disabled={!canEdit || !cur || cur.status === 'Disabled'} aria-expanded={changing}>Change role</Button>
        <Button variant="danger" onClick={() => void askDisable()} disabled={!canEdit || !cur || cur.status === 'Disabled' || self} busy={disable.isPending}>Disable</Button>
      </div>
      {cur && self && <div className="tiny" role="status">You cannot disable your own account.</div>}
      {cur && cur.status === 'Disabled' && <div className="tiny">This account is disabled; it cannot be enabled again here.</div>}
      {changing && cur && (
        <form className="change-role" onSubmit={submitChange}>
          <Field label={`Role of ${cur.username}`}>{(id) => <Select id={id} value={change.role} onChange={(e) => setChange({ ...change, role: e.target.value as StaffRole })}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_NAME[r]}</option>)}</Select>}</Field>
          <Field label="New password" hint="Leave empty to keep the current one" error={passwordProblem(change.password)}>{(id, invalid) => <TextInput id={id} invalid={invalid} type="password" value={change.password} onChange={(e) => setChange({ ...change, password: e.target.value })} autoComplete="new-password" />}</Field>
          <div className="btnrow">
            <Button type="submit" variant="primary" size="sm" disabled={Boolean(passwordProblem(change.password))} busy={update.isPending}>Save</Button>
            <Button variant="link" size="sm" onClick={() => setChanging(false)}>cancel</Button>
          </div>
        </form>
      )}
      <div className="tiny" style={{ marginTop: 8 }}>A disabled account can no longer sign in; its past check-ins keep its name.</div>
    </Card>
  );
}
