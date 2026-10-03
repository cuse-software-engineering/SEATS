import { type FormEvent, useState } from 'react';
import { Button, Card, DataTable, Field, TextInput, type Zone } from '@seats/frontend-shared';
import { zoneTitle } from '../../app/format';
import type { ZoneRow } from './editor-state';

/** "Tables and capacity per zone": one row per zone (a click opens its name), the tables in no zone, Add zone. */
export function ZoneSummaryPanel({ rows, zones, selected, onSelect, onRename, onRemove, onAdd, canEdit, enabled }: {
  rows: ZoneRow[]; zones: Zone[]; selected: string | null; onSelect: (zoneId: string | null) => void; onRename: (zoneId: string, name: string) => void;
  onRemove: (zoneId: string) => void; onAdd: (name: string) => void; canEdit: boolean; enabled: boolean;
}) {
  const [name, setName] = useState('');
  const zone = selected ? zones.find((z) => z.id === selected) : undefined;
  const add = (e: FormEvent) => { e.preventDefault(); onAdd(name.trim()); setName(''); };
  return (
    <Card title="Tables and capacity per zone">
      <DataTable<ZoneRow> testId="zone-summary" small rows={rows} rowKey={(r) => r.key} selectedKey={selected ?? undefined} onRowClick={(r) => onSelect(r.zone?.id ?? null)}
        columns={[
          { key: 'zone', header: 'Zone', cell: (r) => (r.zone ? (r.zone.name ? zoneTitle(r.zone) : <>Zone {(r.zone.id ?? '').toUpperCase()} · <i className="tiny">(no name)</i></>) : <i className="tiny">{r.title}</i>) },
          { key: 'tables', header: 'Tables', align: 'right', width: '56px', cell: (r) => r.tables },
          { key: 'seats', header: 'Seats', align: 'right', width: '52px', cell: (r) => r.seats ?? '–' },
        ]}
        empty={enabled ? 'No zone yet. Add the first one below.' : 'Open a map to see its zones.'} />
      {zone && (
        <div className="zone-edit">
          <Field label={`Name of zone ${(zone.id ?? '').toUpperCase()}`} inline error={!zone.name ? 'Give the zone a name' : null}>
            {(id, invalid) => <TextInput id={id} invalid={invalid} value={zone.name ?? ''} onChange={(e) => onRename(zone.id ?? '', e.target.value)} placeholder="(no name)" disabled={!canEdit} />}
          </Field>
          <Button variant="link" size="sm" onClick={() => onRemove(zone.id ?? '')} disabled={!canEdit}>remove this zone</Button>
        </div>
      )}
      <form className="btnrow" onSubmit={add}>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="zone name" aria-label="new zone name" disabled={!enabled || !canEdit} style={{ flex: 1, width: 'auto', minWidth: 120 }} />
        <Button type="submit" size="sm" disabled={!enabled || !canEdit}>+ Add zone</Button>
      </form>
    </Card>
  );
}
