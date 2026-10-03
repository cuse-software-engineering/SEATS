import { type FormEvent, useEffect, useState } from 'react';
import { api, Badge, Button, type BusinessParameters, Card, Field, fmtClock, LoadError, Loading, TextInput, useMutate, useSession } from '@seats/frontend-shared';
import { keys, useBusinessParameters } from '../../app/queries';

type Key = keyof BusinessParameters;
const FIELDS: { key: Key; label: string; unit: string; min: number }[] = [
  { key: 'holdPeriodMinutes', label: 'Hold period', unit: 'min', min: 1 },
  { key: 'checkInWindowHours', label: 'Check-in window', unit: 'h before the start', min: 0 },
  { key: 'gracePeriodMinutes', label: 'Grace period', unit: 'min after the start', min: 0 },
  { key: 'extraPersonFee', label: 'Extra-person fee', unit: 'THB per person', min: 0 },
];
type Values = Record<Key, string>;
const fromParams = (p: BusinessParameters): Values => ({ holdPeriodMinutes: String(p.holdPeriodMinutes ?? ''), checkInWindowHours: String(p.checkInWindowHours ?? ''), gracePeriodMinutes: String(p.gracePeriodMinutes ?? ''), extraPersonFee: String(p.extraPersonFee ?? '') });
const EMPTY: Values = { holdPeriodMinutes: '', checkInWindowHours: '', gracePeriodMinutes: '', extraPersonFee: '' };

const problem = (f: (typeof FIELDS)[number], v: string): string | null => {
  if (v === '') return 'Required';
  const n = Number(v);
  if (!Number.isInteger(n)) return 'A whole number';
  if (n < f.min) return f.min === 0 ? 'Cannot be negative' : `At least ${f.min}`;
  return null;
};

/** The four business parameters with Save; what each one does is said under the form. */
export function BusinessParametersForm({ canEdit }: { canEdit: boolean }) {
  const session = useSession();
  const params = useBusinessParameters();
  const [state, setState] = useState<{ values: Values; dirty: boolean }>({ values: EMPTY, dirty: false });
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  useEffect(() => {
    if (params.data) setState((s) => (s.dirty ? s : { values: fromParams(params.data), dirty: false }));
  }, [params.data]);
  const save = useMutate((body: BusinessParameters) => api.put<BusinessParameters>('/api/business-parameters', body), {
    success: 'Saved', failure: 'Could not save', invalidate: [keys.businessParameters],
    onSuccess: (saved) => { setState({ values: fromParams(saved), dirty: false }); setSavedAt(new Date()); },
  });
  const errors = Object.fromEntries(FIELDS.map((f) => [f.key, problem(f, state.values[f.key])])) as Record<Key, string | null>;
  const invalid = FIELDS.some((f) => errors[f.key]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    save.mutate(Object.fromEntries(FIELDS.map((f) => [f.key, Number(state.values[f.key])])) as BusinessParameters);
  };
  const set = (key: Key, v: string) => setState((s) => ({ values: { ...s.values, [key]: v }, dirty: true }));

  return (
    <Card title="Business parameters" className="business-parameters" id="business-parameters" data-testid="business-parameters"
      actions={state.dirty ? <Badge hatch>Unsaved changes</Badge> : savedAt ? <Badge ok>Saved</Badge> : undefined}>
      {params.isLoading && <Loading what="Loading the parameters" />}
      {params.isError && <LoadError error={params.error} retry={() => void params.refetch()} what="load the parameters" />}
      <form onSubmit={submit}>
        {FIELDS.map((f) => (
          <Field key={f.key} label={f.label} inline unit={f.unit} error={state.dirty ? errors[f.key] : null}>
            {(id, isInvalid) => <TextInput id={id} type="number" min={f.min} invalid={isInvalid} value={state.values[f.key]} onChange={(e) => set(f.key, e.target.value)} disabled={!params.data || !canEdit} />}
          </Field>
        ))}
        <div className="btnrow">
          <Button type="submit" variant="primary" disabled={!canEdit || !params.data || !state.dirty || invalid} busy={save.isPending}>Save</Button>
          {savedAt && <span className="tiny">Last saved {fmtClock(savedAt.toISOString())} by {session?.label ?? session?.userId}</span>}
        </div>
      </form>
      <div className="tiny" style={{ marginTop: 8 }}>
        The hold period bounds every new hold; the check-in window and the grace period are derived for each round from these values; the extra-person fee is charged per person above the capacity of the table type. A published round keeps the values it was published with.
      </div>
    </Card>
  );
}
