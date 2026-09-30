import { type FormEvent, useEffect, useState } from 'react';
import {
  api, Badge, ErrorAlert, type Removed, type TableType, useAction, useLoad, type ValidationResult, type Zone, type ZoneMap,
  type ZoneMapSummary, type ZoneMapTable,
} from '@seats/frontend-shared';

const num = (v: string): number | undefined => (v === '' ? undefined : Number(v));

/** B2 Zone map editor (UC-04; table types, FR-37): the map list, a new map, the image name, zones and tables in row
 *  editors (no drag and drop), tables and capacity per zone, validation, Activate, Discard; the table types. */
export default function B2ZoneMapEditor() {
  const maps = useLoad(() => api.get<ZoneMapSummary[]>('/api/zone-maps'), []);
  const types = useLoad(() => api.get<TableType[]>('/api/table-types'), []);
  const [selected, setSelected] = useState<string | null>(null);
  const map = useLoad<ZoneMap | null>(() => (selected ? api.get<ZoneMap>(`/api/zone-maps/${selected}`) : Promise.resolve(null)), [selected]);
  const action = useAction();
  const [newName, setNewName] = useState('');
  const [name, setName] = useState('');
  const [fileName, setFileName] = useState('');
  const [zones, setZones] = useState<Zone[]>([]);
  const [tables, setTables] = useState<ZoneMapTable[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [tt, setTt] = useState({ id: '', name: '', capacity: '', packageContent: '' });
  useEffect(() => {
    if (map.data) { setName(map.data.name ?? ''); setZones(map.data.zones ?? []); setTables(map.data.tables ?? []); setValidation(null); }
  }, [map.data]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const created = await action.run(() => api.post<ZoneMap>('/api/zone-maps', { name: newName.trim() || undefined }));
    if (created?.id) { setNewName(''); maps.reload(); setSelected(created.id); }
  };
  const save = async () => {
    const saved = await action.run(() => api.put<ZoneMap>(`/api/zone-maps/${selected}`, { name, zones, tables }));
    if (saved) { map.setData(saved); maps.reload(); }
  };
  const upload = async () => {
    const r = await action.run(() => api.post<ZoneMap>(`/api/zone-maps/${selected}/image`, { fileName }));
    if (r) map.setData(r);
  };
  const validate = async () => {
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
    const r = await action.run(() => api.put<TableType>(`/api/table-types/${tt.id.trim()}`, { name: tt.name, capacity: Number(tt.capacity), packageContent: tt.packageContent || undefined }));
    if (r) { types.reload(); setTt({ id: '', name: '', capacity: '', packageContent: '' }); }
  };

  const setZone = (i: number, patch: Partial<Zone>) => setZones((zs) => zs.map((z, j) => (j === i ? { ...z, ...patch } : z)));
  const setTable = (i: number, patch: Partial<ZoneMapTable>) => setTables((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const addTable = () => setTables((ts) => [...ts, { tableNumber: Math.max(0, ...ts.map((t) => t.tableNumber ?? 0)) + 1, zoneId: zones[0]?.id, tableTypeId: types.data?.[0]?.id, capacity: types.data?.[0]?.capacity, x: 0, y: 0 }]);
  const m = map.data;

  return (
    <>
      <h1>Zone maps</h1>
      <ErrorAlert error={maps.error} />
      <ErrorAlert error={types.error} />
      <ErrorAlert error={map.error} />
      <ErrorAlert error={action.error} onClose={action.clear} />
      <div className="two-col">
        <div>
          <div className="card">
            <h4>Maps</h4>
            {maps.data?.length === 0 && <p className="muted small">No zone map yet.</p>}
            {maps.data?.map((z) => (
              <button key={z.id} type="button" className={`list-item${z.id === selected ? ' active' : ''}`} onClick={() => setSelected(z.id ?? null)}>
                {z.name || <span className="muted">(unnamed)</span>} <Badge solid={z.status === 'Active'}>{z.status}</Badge>
                <div className="small muted">{z.tables ?? 0} tables · <code>{z.id}</code></div>
              </button>
            ))}
            <form className="row" onSubmit={create}>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New map name" />
              <button type="submit" disabled={action.busy}>New map</button>
            </form>
          </div>
          <form className="card" onSubmit={saveType}>
            <h4>Table types (FR-37)</h4>
            <table className="data">
              <thead><tr><th>Id</th><th>Name</th><th>Seats</th><th>Package</th></tr></thead>
              <tbody>
                {types.data?.map((t) => (
                  <tr key={t.id} onClick={() => setTt({ id: t.id, name: t.name, capacity: String(t.capacity), packageContent: t.packageContent ?? '' })} style={{ cursor: 'pointer' }}>
                    <td><code>{t.id}</code></td><td>{t.name}</td><td>{t.capacity}</td><td className="small">{t.packageContent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <label className="field">Id<input value={tt.id} onChange={(e) => setTt({ ...tt, id: e.target.value })} placeholder="sofa6" /></label>
            <label className="field">Name<input value={tt.name} onChange={(e) => setTt({ ...tt, name: e.target.value })} /></label>
            <label className="field">Capacity<input type="number" min={1} value={tt.capacity} onChange={(e) => setTt({ ...tt, capacity: e.target.value })} /></label>
            <label className="field">Package content<input value={tt.packageContent} onChange={(e) => setTt({ ...tt, packageContent: e.target.value })} /></label>
            <button type="submit" disabled={action.busy || !tt.id.trim() || !tt.name.trim() || !tt.capacity}>Define table type</button>
          </form>
        </div>

        <div>
          {!m && <div className="card muted">Choose a map or create one.</div>}
          {m && (
            <>
              <div className="card">
                <div className="row" data-testid="map-head">
                  <h2 style={{ margin: 0 }}>{m.name || '(unnamed)'}</h2>
                  <Badge solid={m.status === 'Active'}>{m.status}</Badge>
                  <code className="small muted">{m.id}</code>
                </div>
                <label className="field">Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
                <div className="row">
                  <input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="venue image file name, e.g. main-hall.png" style={{ flex: 1 }} />
                  <button type="button" className="secondary" onClick={upload} disabled={action.busy || !fileName.trim()}>Upload image name</button>
                </div>
                {m.imageUrl && <p className="small muted">Image: <code>{m.imageUrl}</code> (the media upload is a stub, progress 1)</p>}

                <h3>Zones</h3>
                <table className="data" data-testid="zones">
                  <thead><tr><th>Id</th><th>Name</th><th></th></tr></thead>
                  <tbody>
                    {zones.map((z, i) => (
                      <tr key={i}>
                        <td className="tight"><input value={z.id ?? ''} onChange={(e) => setZone(i, { id: e.target.value })} style={{ width: 70 }} /></td>
                        <td><input value={z.name ?? ''} onChange={(e) => setZone(i, { name: e.target.value })} /></td>
                        <td className="tight"><button type="button" className="link" onClick={() => setZones((zs) => zs.filter((_, j) => j !== i))}>remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="row"><button type="button" className="secondary" onClick={() => setZones((zs) => [...zs, { id: String.fromCharCode(65 + zs.length), name: '' }])}>Add zone</button></div>

                <h3>Tables</h3>
                <table className="data" data-testid="tables">
                  <thead><tr><th>#</th><th>Zone</th><th>Table type</th><th>Seats</th><th>x</th><th>y</th><th></th></tr></thead>
                  <tbody>
                    {tables.map((t, i) => (
                      <tr key={i}>
                        <td className="tight"><input type="number" value={t.tableNumber ?? ''} onChange={(e) => setTable(i, { tableNumber: num(e.target.value) })} style={{ width: 64 }} /></td>
                        <td><select value={t.zoneId ?? ''} onChange={(e) => setTable(i, { zoneId: e.target.value })}><option value="">—</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.id} {z.name}</option>)}</select></td>
                        <td><select value={t.tableTypeId ?? ''} onChange={(e) => { const ty = types.data?.find((x) => x.id === e.target.value); setTable(i, { tableTypeId: e.target.value, capacity: ty?.capacity ?? t.capacity }); }}><option value="">—</option>{types.data?.map((ty) => <option key={ty.id} value={ty.id}>{ty.name}</option>)}</select></td>
                        <td className="tight"><input type="number" value={t.capacity ?? ''} onChange={(e) => setTable(i, { capacity: num(e.target.value) })} style={{ width: 64 }} /></td>
                        <td className="tight"><input type="number" value={t.x ?? ''} onChange={(e) => setTable(i, { x: num(e.target.value) })} style={{ width: 64 }} /></td>
                        <td className="tight"><input type="number" value={t.y ?? ''} onChange={(e) => setTable(i, { y: num(e.target.value) })} style={{ width: 64 }} /></td>
                        <td className="tight"><button type="button" className="link" onClick={() => setTables((ts) => ts.filter((_, j) => j !== i))}>remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="row">
                  <button type="button" className="secondary" onClick={addTable}>Add table</button>
                  <button type="button" onClick={save} disabled={action.busy}>Save</button>
                  <button type="button" className="secondary" onClick={validate} disabled={action.busy}>Validate</button>
                  <button type="button" className="secondary" onClick={activate} disabled={action.busy || m.status === 'Active'}>Activate</button>
                  {m.status === 'Draft' && <button type="button" className="secondary" onClick={discard} disabled={action.busy}>Discard</button>}
                </div>
                {validation && (
                  <div className={validation.valid ? 'notice' : 'alert'} data-testid="validation">
                    {validation.valid ? 'The map is valid.' : 'The map is not valid:'}
                    {validation.problems && validation.problems.length > 0 && <ul className="problems">{validation.problems.map((p, i) => <li key={i}>{p}</li>)}</ul>}
                  </div>
                )}
              </div>
              <div className="card">
                <h4>Tables and capacity per zone (as saved)</h4>
                <table className="data" data-testid="zone-summary">
                  <thead><tr><th>Zone</th><th className="num">Tables</th><th className="num">Capacity</th></tr></thead>
                  <tbody>{(m.summary ?? []).map((s) => <tr key={s.zoneId}><td>{s.zoneId} {s.name}</td><td className="num">{s.tables}</td><td className="num">{s.capacity}</td></tr>)}</tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
