import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  api, Badge, ErrorAlert, type GridTable, type Removed, TableGrid, tableLabel, type TableType, useAction, useLoad,
  type ValidationResult, type Zone, type ZoneMap, type ZoneMapSummary, type ZoneMapTable,
} from '@seats/frontend-shared';
import { fmtDay, plural, ValidationBox } from '../parts';

const num = (v: string): number | undefined => (v === '' ? undefined : Number(v));
interface TypeForm { id: string; name: string; capacity: string; packageContent: string }
const EMPTY_TYPE: TypeForm = { id: '', name: '', capacity: '', packageContent: '' };

/** B2 Zone map editor (UC-04, Table D.11; the table types, FR-37), laid out as the wireframe: the map list at the
 *  left, the map canvas in the middle (the stage, one dashed box per zone, one shape per table over the venue-image
 *  placeholder) with Upload image, Save, Validate, Activate and the validation result under it, and at the right the
 *  properties of the selected table, the tables and capacity per zone, and the table types. A table is edited in the
 *  properties card after a click on its shape; a new table gets the next free number. Activate opens once the saved
 *  map passes validation; Validate saves the draft first. */
export default function B2ZoneMapEditor() {
  const maps = useLoad(() => api.get<ZoneMapSummary[]>('/api/zone-maps'), []);
  const types = useLoad(() => api.get<TableType[]>('/api/table-types'), []);
  const [selected, setSelected] = useState<string | null>(null);
  const map = useLoad<ZoneMap | null>(() => (selected ? api.get<ZoneMap>(`/api/zone-maps/${selected}`) : Promise.resolve(null)), [selected]);
  const action = useAction();
  const [newName, setNewName] = useState('');
  const [fileName, setFileName] = useState('');
  const [zones, setZones] = useState<Zone[]>([]);
  const [tables, setTables] = useState<ZoneMapTable[]>([]);
  const [dirty, setDirty] = useState(false);
  const [sel, setSel] = useState<number | null>(null);        // the index in `tables` of the selected table
  const [selZone, setSelZone] = useState<string | null>(null); // the zone whose name is being edited
  const [newZone, setNewZone] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [typeForm, setTypeForm] = useState<TypeForm | null>(null);
  useEffect(() => {
    const m = map.data;
    if (!m) { setZones([]); setTables([]); setSel(null); setSelZone(null); setValidation(null); setDirty(false); return; }
    setZones(m.zones ?? []);
    setTables(m.tables ?? []);
    setSel((s) => (s !== null && s < (m.tables?.length ?? 0) ? s : null));
    setValidation(null);
    setDirty(false);
  }, [map.data]);

  // every local change invalidates the last validation result (Activate closes again until the next pass)
  const edit = (fn: () => void) => { fn(); setDirty(true); setValidation(null); };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const created = await action.run(() => api.post<ZoneMap>('/api/zone-maps', { name: newName.trim() || undefined }));
    if (created?.id) { setNewName(''); maps.reload(); setSelected(created.id); }
  };
  const save = async (): Promise<ZoneMap | undefined> => {
    const saved = await action.run(() => api.put<ZoneMap>(`/api/zone-maps/${selected}`, { name: map.data?.name, zones, tables }));
    if (saved) { map.setData(saved); maps.reload(); }
    return saved;
  };
  const upload = async () => {
    const r = await action.run(() => api.post<ZoneMap>(`/api/zone-maps/${selected}/image`, { fileName }));
    if (r) { map.setData({ ...r, zones, tables }); setFileName(''); }
  };
  const validate = async () => {
    if (dirty && !(await save())) return;
    const r = await action.run(() => api.post<ValidationResult>(`/api/zone-maps/${selected}/validate`));
    if (r) setValidation(r);
  };
  const activate = async () => {
    const r = await action.run(() => api.post<ZoneMap>(`/api/zone-maps/${selected}/activate`));
    if (r) { map.setData(r); maps.reload(); }
  };
  const discard = async () => {
    if (!window.confirm('Discard this Draft zone map?')) return;
    const r = await action.run(() => api.delete<Removed>(`/api/zone-maps/${selected}`));
    if (r) { setSelected(null); maps.reload(); }
  };
  const saveType = async (e: FormEvent) => {
    e.preventDefault();
    if (!typeForm) return;
    const r = await action.run(() => api.put<TableType>(`/api/table-types/${typeForm.id.trim()}`, { name: typeForm.name, capacity: Number(typeForm.capacity), packageContent: typeForm.packageContent || undefined }));
    if (r) { types.reload(); setTypeForm(null); }
  };

  // ---- the tables and zones
  const m = map.data;
  const cur = sel !== null ? tables[sel] : undefined;
  const typeOf = (id: string | undefined) => types.data?.find((t) => t.id === id);
  const gridTables: GridTable[] = useMemo(
    () => tables.map((t) => ({ ...t, zoneName: zones.find((z) => z.id === t.zoneId)?.name, tableTypeName: typeOf(t.tableTypeId)?.name })),
    [tables, zones, types.data],   // eslint-disable-line react-hooks/exhaustive-deps
  );
  const setCur = (patch: Partial<ZoneMapTable>) => edit(() => setTables((ts) => ts.map((t, i) => (i === sel ? { ...t, ...patch } : t))));
  const addTable = () => edit(() => {
    const next = Math.max(0, ...tables.map((t) => t.tableNumber ?? 0)) + 1;
    const t: ZoneMapTable = { tableNumber: next, zoneId: cur?.zoneId ?? zones[0]?.id, tableTypeId: cur?.tableTypeId, capacity: cur?.capacity, x: 0, y: 0 };
    setTables((ts) => [...ts, t]);
    setSel(tables.length);
  });
  const removeTable = () => edit(() => { setTables((ts) => ts.filter((_, i) => i !== sel)); setSel(null); });
  const nextZoneId = (): string => { for (let i = 0; i < 26; i++) { const id = String.fromCharCode(65 + i); if (!zones.some((z) => z.id === id)) return id; } return `Z${zones.length + 1}`; };
  const addZone = (e: FormEvent) => {
    e.preventDefault();
    const id = nextZoneId();
    edit(() => setZones((zs) => [...zs, { id, name: newZone.trim() }]));
    setNewZone('');
    setSelZone(id);
  };
  const renameZone = (id: string, name: string) => edit(() => setZones((zs) => zs.map((z) => (z.id === id ? { ...z, name } : z))));
  const removeZone = (id: string) => edit(() => { setZones((zs) => zs.filter((z) => z.id !== id)); setSelZone(null); });
  const perZone = zones.map((z) => {
    const ts = tables.filter((t) => t.zoneId === z.id);
    const caps = ts.map((t) => t.capacity).filter((c): c is number => typeof c === 'number' && c > 0);
    return { zone: z, tables: ts.length, seats: caps.length ? caps.reduce((a, b) => a + b, 0) : undefined };
  });
  const orphans = tables.filter((t) => !zones.some((z) => z.id === t.zoneId));
  const zoneTitle = (z: Zone) => `Zone ${(z.id ?? '').toUpperCase()}${z.name ? ` · ${z.name}` : ''}`;

  return (
    <>
      <ErrorAlert error={maps.error} />
      <ErrorAlert error={types.error} />
      <ErrorAlert error={map.error} />
      <ErrorAlert error={action.error} onClose={action.clear} />
      <div className="cols">
        {/* ---- the list of maps */}
        <div className="list" style={{ width: 170, flex: 'none' }}>
          <h1 className="hd">Zone maps</h1>
          <form onSubmit={create}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New map name" aria-label="New map name" />
            <button type="submit" className="small wide" disabled={action.busy}>+ New map</button>
          </form>
          {maps.data?.length === 0 && <div className="tiny">No zone map yet.</div>}
          {maps.data?.map((z) => (
            <button key={z.id} type="button" className={`it${z.id === selected ? ' cur' : ''}`} onClick={() => setSelected(z.id ?? null)}>
              <div className="name">{z.name || '(unnamed)'}</div>
              <div className="tiny">{plural(z.tables ?? 0, 'table')}{z.id === selected && m?.createdAt ? ` · created ${fmtDay(m.createdAt, false)}` : ''}</div>
              <Badge fill={z.status === 'Active'}>{z.status}</Badge>
            </button>
          ))}
        </div>

        {/* ---- the map */}
        <div style={{ width: 396, flex: 'none', minWidth: 0 }}>
          {!m && <div className="placeholder" style={{ height: 200, borderRadius: 6 }}>Choose a map or create one.</div>}
          {m && (
            <>
              <div className="row" style={{ marginBottom: 6 }}>
                <span className="b" data-testid="map-head">{m.name || '(unnamed)'} <Badge fill={m.status === 'Active'}>{m.status}</Badge></span>
                <span className="tiny">Draw a zone, then place tables in it</span>
              </div>
              <div className="map-canvas" data-testid="map-canvas">
                <TableGrid tables={gridTables} zones={zones.map((z) => ({ id: z.id ?? '', name: z.name }))} selected={cur?.tableNumber}
                  onSelect={(t) => { const i = gridTables.indexOf(t); if (i >= 0) setSel(i); }} />
                <span className="venue-image" title={m.imageUrl}>venue image: {m.imageUrl ? m.imageUrl.split('/').pop() : 'none yet'}</span>
              </div>
              <div className="btnrow">
                <input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="venue image file name, e.g. main-hall.png" aria-label="venue image file name" style={{ flex: 1, minWidth: 140 }} />
                <button type="button" onClick={upload} disabled={action.busy || !fileName.trim()}>Upload image</button>
              </div>
              <div className="btnrow" style={{ marginTop: 8 }}>
                <button type="button" onClick={save} disabled={action.busy}>Save</button>
                <button type="button" onClick={validate} disabled={action.busy}>Validate</button>
                <button type="button" className="primary" onClick={activate} disabled={action.busy || m.status === 'Active' || !validation?.valid}>Activate</button>
                {m.status === 'Draft' && <button type="button" onClick={discard} disabled={action.busy}>Discard</button>}
              </div>
              {validation
                ? <ValidationBox result={validation} hint="Activate opens once the map passes validation; the preview then shows it as the Customer sees it." />
                : <div className="tiny" style={{ marginTop: 8 }}>{m.status === 'Active' ? 'This map is Active: a round can use it.' : `Validate ${dirty ? 'saves the draft and ' : ''}checks the map; Activate opens once it passes.`}</div>}
            </>
          )}
        </div>

        {/* ---- the properties, the zones, the table types */}
        <div style={{ width: 296, flex: 'none' }}>
          <div className="panel" data-testid="table-properties">
            <div className="pt">Table properties · {cur ? `selected ${tableLabel(cur.zoneId, cur.tableNumber)}` : 'no table selected'}</div>
            <div className="frow">
              <label className="fl" htmlFor="tp-number">Number</label>
              <input id="tp-number" type="number" min={1} value={cur?.tableNumber ?? ''} onChange={(e) => setCur({ tableNumber: num(e.target.value) })} disabled={!cur} />
            </div>
            <div className="frow">
              <label className="fl" htmlFor="tp-zone">Zone</label>
              <select id="tp-zone" value={cur?.zoneId ?? ''} onChange={(e) => setCur({ zoneId: e.target.value || undefined })} disabled={!cur}>
                <option value="">—</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{zoneTitle(z)}</option>)}
              </select>
            </div>
            <div className="frow">
              <label className="fl" htmlFor="tp-type">Table type</label>
              <select id="tp-type" value={cur?.tableTypeId ?? ''} onChange={(e) => { const ty = typeOf(e.target.value); setCur({ tableTypeId: e.target.value || undefined, capacity: ty?.capacity ?? cur?.capacity }); }} disabled={!cur}>
                <option value="">—</option>
                {types.data?.map((ty) => <option key={ty.id} value={ty.id}>{ty.name}</option>)}
              </select>
            </div>
            <div className="frow">
              <label className="fl" htmlFor="tp-capacity">Capacity</label>
              <input id="tp-capacity" type="number" min={1} value={cur?.capacity ?? ''} onChange={(e) => setCur({ capacity: num(e.target.value) })} disabled={!cur} />
              <span className="unit">seats</span>
            </div>
            <div className="btnrow" style={{ marginTop: 6 }}>
              <button type="button" className="small" onClick={addTable} disabled={!m}>+ Add table</button>
              <button type="button" className="small" onClick={removeTable} disabled={!cur}>Remove table</button>
            </div>
          </div>

          <div className="panel">
            <div className="pt">Tables and capacity per zone</div>
            <table className="tbl clickable" data-testid="zone-summary">
              <thead><tr><th>Zone</th><th className="num" style={{ width: 56 }}>Tables</th><th className="num" style={{ width: 52 }}>Seats</th></tr></thead>
              <tbody>
                {perZone.map(({ zone, tables: n, seats }) => (
                  <tr key={zone.id} className={zone.id === selZone ? 'sel' : ''} onClick={() => setSelZone(zone.id ?? null)}>
                    <td>{zone.name ? zoneTitle(zone) : <>Zone {(zone.id ?? '').toUpperCase()} · <i className="tiny">(no name)</i></>}</td>
                    <td className="num">{n}</td>
                    <td className="num">{seats ?? '–'}</td>
                  </tr>
                ))}
                {orphans.length > 0 && <tr><td><i className="tiny">(no zone)</i></td><td className="num">{orphans.length}</td><td className="num">–</td></tr>}
              </tbody>
            </table>
            {selZone !== null && zones.some((z) => z.id === selZone) && (
              <div className="frow" style={{ marginTop: 6 }}>
                <label className="fl" htmlFor="zone-name">Name of zone {selZone.toUpperCase()}</label>
                <input id="zone-name" value={zones.find((z) => z.id === selZone)?.name ?? ''} onChange={(e) => renameZone(selZone, e.target.value)} placeholder="(no name)" />
                <button type="button" className="link tiny" onClick={() => removeZone(selZone)}>remove</button>
              </div>
            )}
            <form className="frow" onSubmit={addZone} style={{ marginTop: 6 }}>
              <input value={newZone} onChange={(e) => setNewZone(e.target.value)} placeholder="zone name" aria-label="new zone name" disabled={!m} />
              <button type="submit" className="small" disabled={!m}>+ Add zone</button>
            </form>
          </div>

          <div className="panel" data-testid="table-types">
            <div className="pt">Table types</div>
            <table className="tbl small clickable">
              <thead><tr><th style={{ width: 110 }}>Name</th><th className="num" style={{ width: 40 }}>Cap.</th><th>Package content</th></tr></thead>
              <tbody>
                {types.data?.map((t) => (
                  <tr key={t.id} className={typeForm?.id === t.id ? 'sel' : ''} onClick={() => setTypeForm({ id: t.id, name: t.name, capacity: String(t.capacity), packageContent: t.packageContent ?? '' })}>
                    <td>{t.name}</td><td className="num">{t.capacity}</td><td>{t.packageContent}</td>
                  </tr>
                ))}
                {types.data?.length === 0 && <tr><td colSpan={3} className="tiny">No table type yet.</td></tr>}
              </tbody>
            </table>
            <div className="btnrow" style={{ marginTop: 6 }}>
              <button type="button" className="small" onClick={() => setTypeForm(typeForm ? null : EMPTY_TYPE)}>+ Add table type</button>
            </div>
            {typeForm && (
              <form onSubmit={saveType} style={{ marginTop: 6 }}>
                <div className="frow"><label className="fl" htmlFor="tt-id">Id</label><input id="tt-id" value={typeForm.id} onChange={(e) => setTypeForm({ ...typeForm, id: e.target.value })} placeholder="sofa6" /></div>
                <div className="frow"><label className="fl" htmlFor="tt-name">Name</label><input id="tt-name" value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} /></div>
                <div className="frow"><label className="fl" htmlFor="tt-cap">Capacity</label><input id="tt-cap" type="number" min={1} value={typeForm.capacity} onChange={(e) => setTypeForm({ ...typeForm, capacity: e.target.value })} /><span className="unit">seats</span></div>
                <div className="frow"><label className="fl" htmlFor="tt-content">Package content</label><input id="tt-content" value={typeForm.packageContent} onChange={(e) => setTypeForm({ ...typeForm, packageContent: e.target.value })} /></div>
                <div className="btnrow" style={{ marginTop: 6 }}>
                  <button type="submit" className="small primary" disabled={action.busy || !typeForm.id.trim() || !typeForm.name.trim() || !typeForm.capacity}>Define table type</button>
                  <button type="button" className="link tiny" onClick={() => setTypeForm(null)}>cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
