import { Button, Card, Field, Select, type TableType, TextInput, type Zone, type ZoneMapTable } from '@seats/frontend-shared';
import { zoneTitle } from '../../app/format';
import type { TableProblems } from './editor-state';

const num = (v: string): number | undefined => (v === '' ? undefined : Number(v));

/** The properties of the selected table: number, zone, table type (which sets the capacity) and capacity; the
 *  problems of the table under its fields; Add table and Remove table. */
export function TablePropertiesPanel({ table, label, zones, types, problems, onChange, onAdd, onRemove, canAdd, canEdit }: {
  table: ZoneMapTable | undefined; label: string; zones: Zone[]; types: TableType[]; problems: TableProblems;
  onChange: (patch: Partial<ZoneMapTable>) => void; onAdd: () => void; onRemove: () => void; canAdd: boolean; canEdit: boolean;
}) {
  const disabled = !table || !canEdit;
  const changeType = (typeId: string) => {
    const ty = types.find((t) => t.id === typeId);
    onChange({ tableTypeId: typeId || undefined, capacity: ty?.capacity ?? table?.capacity });
  };
  return (
    <Card title={`Table properties · ${table ? `selected ${label}` : 'no table selected'}`} data-testid="table-properties">
      <Field label="Number" inline error={problems.number}>
        {(id, invalid) => <TextInput id={id} type="number" min={1} invalid={invalid} value={table?.tableNumber ?? ''} onChange={(e) => onChange({ tableNumber: num(e.target.value) })} disabled={disabled} />}
      </Field>
      <Field label="Zone" inline error={problems.zone}>
        {(id) => (
          <Select id={id} value={table?.zoneId ?? ''} onChange={(e) => onChange({ zoneId: e.target.value || undefined })} disabled={disabled}>
            <option value="">—</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{zoneTitle(z)}</option>)}
          </Select>
        )}
      </Field>
      <Field label="Table type" inline error={problems.type}>
        {(id) => (
          <Select id={id} value={table?.tableTypeId ?? ''} onChange={(e) => changeType(e.target.value)} disabled={disabled}>
            <option value="">—</option>
            {types.map((ty) => <option key={ty.id} value={ty.id}>{ty.name}</option>)}
          </Select>
        )}
      </Field>
      <Field label="Capacity" inline unit="seats" error={problems.capacity}>
        {(id, invalid) => <TextInput id={id} type="number" min={1} invalid={invalid} value={table?.capacity ?? ''} onChange={(e) => onChange({ capacity: num(e.target.value) })} disabled={disabled} />}
      </Field>
      <div className="btnrow" style={{ marginTop: 6 }}>
        <Button size="sm" onClick={onAdd} disabled={!canAdd || !canEdit}>+ Add table</Button>
        <Button size="sm" variant="danger" onClick={onRemove} disabled={disabled}>Remove table</Button>
      </div>
      {!table && canAdd && <div className="tiny" style={{ marginTop: 6 }}>Click a table on the map to edit it, or add one.</div>}
    </Card>
  );
}
