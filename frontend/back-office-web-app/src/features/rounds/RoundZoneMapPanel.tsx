import { Card, Field, Select, tableLabel, type TableType, type ZoneMap, type ZoneMapSummary } from '@seats/frontend-shared';

/** "Zone map": the active map the round uses, and the tables it does not sell as chips (× puts one back for sale). */
export function RoundZoneMapPanel({ zoneMapId, activeMaps, zoneMap, types, tablesNotForSale, onChangeMap, onMark, onUnmark, disabled }: {
  zoneMapId: string; activeMaps: ZoneMapSummary[]; zoneMap: ZoneMap | undefined; types: TableType[]; tablesNotForSale: number[];
  onChangeMap: (id: string) => void; onMark: (n: number) => void; onUnmark: (n: number) => void; disabled: boolean;
}) {
  const mapTables = zoneMap?.tables ?? [];
  const typeName = (id: string | undefined) => types.find((t) => t.id === id)?.name ?? id ?? '';
  const zoneOf = (n: number) => mapTables.find((t) => t.tableNumber === n)?.zoneId;
  const unmarked = mapTables.filter((t) => t.tableNumber !== undefined && !tablesNotForSale.includes(t.tableNumber));
  return (
    <Card title="Zone map">
      <Field label="Zone map" inline hint={activeMaps.length === 0 ? 'No active zone map yet: activate one in Zone maps.' : undefined}>
        {(id) => (
          <Select id={id} value={zoneMapId} onChange={(e) => onChangeMap(e.target.value)} disabled={disabled}>
            <option value="">—</option>
            {activeMaps.map((m) => <option key={m.id} value={m.id}>{m.name} (Active, {m.tables} tables)</option>)}
            {zoneMapId && !activeMaps.some((m) => m.id === zoneMapId) && <option value={zoneMapId}>{zoneMap?.name ?? 'the chosen map'}</option>}
          </Select>
        )}
      </Field>
      <div className="tiny" style={{ margin: '6px 0 3px' }}>Tables not for sale in this round</div>
      <div data-testid="not-for-sale">
        {tablesNotForSale.map((n) => (
          <button key={n} type="button" className="chip" onClick={() => onUnmark(n)} disabled={disabled} title="put this table back for sale" aria-label={`table ${tableLabel(zoneOf(n), n)} not for sale, remove`}>{tableLabel(zoneOf(n), n)} ×</button>
        ))}
        <select className="chip add" value="" onChange={(e) => { if (e.target.value) onMark(Number(e.target.value)); }} aria-label="mark a table not for sale" disabled={disabled || !zoneMap || unmarked.length === 0}>
          <option value="">+ mark a table</option>
          {unmarked.map((t) => <option key={t.tableNumber} value={t.tableNumber}>{tableLabel(t.zoneId, t.tableNumber)} · {typeName(t.tableTypeId)}</option>)}
        </select>
        {tablesNotForSale.length === 0 && <span className="tiny" style={{ marginLeft: 4 }}>every table is for sale</span>}
      </div>
    </Card>
  );
}
