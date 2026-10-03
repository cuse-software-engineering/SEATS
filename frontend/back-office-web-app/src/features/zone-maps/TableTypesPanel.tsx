import { type FormEvent, useState } from 'react';
import { api, Button, Card, DataTable, Field, LoadError, Loading, type TableType, TextInput, useMutate } from '@seats/frontend-shared';
import { keys, type useTableTypes } from '../../app/queries';

interface TypeForm { id: string; name: string; capacity: string; packageContent: string }
const EMPTY: TypeForm = { id: '', name: '', capacity: '', packageContent: '' };

/** The venue's table types: the list (a click opens one for editing) and the form that defines or changes one. */
export function TableTypesPanel({ types, canEdit }: { types: ReturnType<typeof useTableTypes>; canEdit: boolean }) {
  const [form, setForm] = useState<TypeForm | null>(null);
  const define = useMutate((f: TypeForm) => api.put<TableType>(`/api/table-types/${f.id.trim()}`, { name: f.name.trim(), capacity: Number(f.capacity), packageContent: f.packageContent.trim() || undefined }), {
    success: (ty) => `Table type "${ty.name}" defined`, failure: 'Could not define the table type', invalidate: [keys.tableTypes], onSuccess: () => setForm(null),
  });
  const errors = form && {
    id: form.id && !/^[A-Za-z0-9_-]+$/.test(form.id.trim()) ? 'Letters, digits, - and _ only' : null,
    capacity: form.capacity !== '' && !(Number(form.capacity) >= 1 && Number.isInteger(Number(form.capacity))) ? 'At least 1 seat' : null,
  };
  const complete = form && form.id.trim() && form.name.trim() && form.capacity !== '' && !errors?.id && !errors?.capacity;
  const submit = (e: FormEvent) => { e.preventDefault(); if (form && complete) define.mutate(form); };
  return (
    <Card title="Table types" data-testid="table-types" actions={<Button size="sm" onClick={() => setForm(form ? null : EMPTY)} disabled={!canEdit} aria-expanded={Boolean(form)}>+ Add table type</Button>}>
      {types.isLoading && <Loading what="Loading the table types" />}
      {types.isError && <LoadError error={types.error} retry={() => void types.refetch()} what="load the table types" />}
      {types.data && (
        <DataTable<TableType> small rows={types.data} rowKey={(t) => t.id} selectedKey={form?.id} onRowClick={canEdit ? (t) => setForm({ id: t.id, name: t.name, capacity: String(t.capacity), packageContent: t.packageContent ?? '' }) : undefined}
          columns={[
            { key: 'name', header: 'Name', width: '110px', cell: (t) => t.name },
            { key: 'cap', header: 'Cap.', align: 'right', width: '40px', cell: (t) => t.capacity },
            { key: 'content', header: 'Package content', cell: (t) => t.packageContent ?? '' },
          ]}
          empty="No table type yet. Define one to give the tables their seats and package." />
      )}
      {form && (
        <form onSubmit={submit} style={{ marginTop: 6 }}>
          <Field label="Id" inline error={errors?.id} hint={form.id ? undefined : 'A short code, e.g. sofa6'}>{(id, invalid) => <TextInput id={id} invalid={invalid} value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="sofa6" />}</Field>
          <Field label="Name" inline>{(id) => <TextInput id={id} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="6-person sofa" />}</Field>
          <Field label="Capacity" inline unit="seats" error={errors?.capacity}>{(id, invalid) => <TextInput id={id} invalid={invalid} type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />}</Field>
          <Field label="Package content" inline>{(id) => <TextInput id={id} value={form.packageContent} onChange={(e) => setForm({ ...form, packageContent: e.target.value })} placeholder="a bottle and mixers" />}</Field>
          <div className="btnrow" style={{ marginTop: 6 }}>
            <Button type="submit" variant="primary" size="sm" disabled={!complete} busy={define.isPending}>Define table type</Button>
            <Button variant="link" size="sm" onClick={() => setForm(null)}>cancel</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
