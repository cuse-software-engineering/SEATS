import { type FormEvent, useEffect, useState } from 'react';
import {
  api, Badge, ErrorAlert, fmtDateTime, fromLocalInput, type PackagePrice, type Removed, type Round, type RoundTable, type RoundUpdate,
  TableGrid, type TableType, toLocalInput, type UpcomingRound, useAction, useLoad, type ValidationResult, type ZoneMap, type ZoneMapSummary,
} from '@seats/frontend-shared';

interface Form { name: string; artist: string; date: string; doorsOpenAt: string; startAt: string; bookingOpenAt: string; zoneMapId: string; tablesNotForSale: string; prices: PackagePrice[] }
const EMPTY: Form = { name: '', artist: '', date: '', doorsOpenAt: '', startAt: '', bookingOpenAt: '', zoneMapId: '', tablesNotForSale: '', prices: [] };
const parseNumbers = (s: string): number[] => s.split(/[\s,]+/).filter(Boolean).map(Number).filter((n) => Number.isInteger(n));

/** B3 Round editor (UC-03): the round list, a new round, the details and times, the zone map, tables not for sale,
 *  the package price per zone and table type, validation, the preview as the customer sees it (C3), Publish, Discard. */
export default function B3RoundEditor() {
  // GET /api/rounds is the customer's upcoming Published rounds (getUpcomingRounds). The back-office also needs the
  // Draft rounds, an open point (KI-17, Appendix D.3): until a listRounds() exists, a Draft is reopened by its id.
  const rounds = useLoad(() => api.get<UpcomingRound[]>('/api/rounds'), []);
  const activeMaps = useLoad(() => api.get<ZoneMapSummary[]>('/api/zone-maps?status=Active'), []);
  const types = useLoad(() => api.get<TableType[]>('/api/table-types'), []);
  const [selected, setSelected] = useState<string | null>(null);
  const [draftId, setDraftId] = useState('');
  const [newName, setNewName] = useState('');
  const round = useLoad<Round | null>(() => (selected ? api.get<Round>(`/api/rounds/${selected}`) : Promise.resolve(null)), [selected]);
  const [form, setForm] = useState<Form>(EMPTY);
  const zoneMap = useLoad<ZoneMap | null>(() => (form.zoneMapId ? api.get<ZoneMap>(`/api/zone-maps/${form.zoneMapId}`) : Promise.resolve(null)), [form.zoneMapId]);
  const preview = useLoad<RoundTable[] | null>(() => (selected ? api.get<RoundTable[]>(`/api/rounds/${selected}/tables`) : Promise.resolve(null)), [selected, round.data]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const action = useAction();

  useEffect(() => {
    const r = round.data;
    if (!r) { setForm(EMPTY); return; }
    setForm({
      name: r.name ?? '', artist: r.artist ?? '', date: r.date ?? '', doorsOpenAt: toLocalInput(r.doorsOpenAt), startAt: toLocalInput(r.startAt),
      bookingOpenAt: toLocalInput(r.bookingOpenAt), zoneMapId: r.zoneMapId ?? '', tablesNotForSale: (r.tablesNotForSale ?? []).join(', '), prices: r.prices ?? [],
    });
    setValidation(null);
  }, [round.data]);

  // One price row per (zone, table type) present in the chosen map; rows already priced are kept (UC-03 step 9).
  useEffect(() => {
    const m = zoneMap.data;
    if (!m) return;
    setForm((f) => {
      const prices = [...f.prices];
      for (const t of m.tables ?? []) {
        if (t.zoneId && t.tableTypeId && !prices.some((p) => p.zoneId === t.zoneId && p.tableTypeId === t.tableTypeId)) prices.push({ zoneId: t.zoneId, tableTypeId: t.tableTypeId });
      }
      return prices.length === f.prices.length ? f : { ...f, prices };
    });
  }, [zoneMap.data, round.data]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const created = await action.run(() => api.post<Round>('/api/rounds', { name: newName.trim() || undefined }));
    if (created?.id) { setNewName(''); setSelected(created.id); }
  };
  const save = async () => {
    const body: RoundUpdate = {
      name: form.name || undefined, artist: form.artist || undefined, date: form.date || undefined, doorsOpenAt: fromLocalInput(form.doorsOpenAt),
      startAt: fromLocalInput(form.startAt), bookingOpenAt: fromLocalInput(form.bookingOpenAt), zoneMapId: form.zoneMapId || undefined,
      tablesNotForSale: parseNumbers(form.tablesNotForSale), prices: form.prices.filter((p) => p.packagePrice !== undefined && Number.isFinite(p.packagePrice)),
    };
    const saved = await action.run(() => api.put<Round>(`/api/rounds/${selected}`, body));
    if (saved) { round.setData(saved); rounds.reload(); }
  };
  const validate = async () => {
    const r = await action.run(() => api.post<ValidationResult>(`/api/rounds/${selected}/validate`));
    if (r) setValidation(r);
  };
  const publish = async () => {
    const r = await action.run(() => api.post<Round>(`/api/rounds/${selected}/publish`));
    if (r) { round.setData(r); rounds.reload(); }
  };
  const discard = async () => {
    if (!window.confirm('Discard this Draft round?')) return;
    const r = await action.run(() => api.delete<Removed>(`/api/rounds/${selected}`));
    if (r) { setSelected(null); rounds.reload(); }
  };
  const setPrice = (i: number, patch: Partial<PackagePrice>) => setForm((f) => ({ ...f, prices: f.prices.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));
  const field = (key: keyof Omit<Form, 'prices'>) => ({ value: form[key], onChange: (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value }) });
  const typeName = (id: string | undefined) => types.data?.find((t) => t.id === id)?.name ?? id;
  const zoneName = (id: string | undefined) => zoneMap.data?.zones?.find((z) => z.id === id)?.name ?? id;
  const r = round.data;
  const published = r?.status === 'Published';

  const perZone = new Map<string, { name: string; forSale: number; capacity: number }>();
  for (const t of preview.data ?? []) {
    const key = t.zoneId ?? '';
    const z = perZone.get(key) ?? { name: t.zoneName ?? key, forSale: 0, capacity: 0 };
    if (t.forSale !== false) { z.forSale += 1; z.capacity += t.capacity ?? 0; }
    perZone.set(key, z);
  }

  return (
    <>
      <h1>Concert rounds</h1>
      <ErrorAlert error={rounds.error} />
      <ErrorAlert error={activeMaps.error} />
      <ErrorAlert error={types.error} />
      <ErrorAlert error={round.error} />
      <ErrorAlert error={zoneMap.error} />
      <ErrorAlert error={preview.error} />
      <ErrorAlert error={action.error} onClose={action.clear} />
      <div className="two-col">
        <div className="card">
          <h4>Upcoming Published rounds</h4>
          {rounds.data?.length === 0 && <p className="muted small">No Published round yet.</p>}
          {rounds.data?.map((u) => (
            <button key={u.id} type="button" className={`list-item${u.id === selected ? ' active' : ''}`} onClick={() => setSelected(u.id ?? null)}>
              {u.name || '(unnamed)'} <Badge>{u.status}</Badge>
              <div className="small muted">{u.artist} · {u.date}</div>
            </button>
          ))}
          <form className="row" onSubmit={create}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New round name" />
            <button type="submit" disabled={action.busy}>New round</button>
          </form>
          <h4>Open a Draft round by id (KI-17)</h4>
          <form className="row" onSubmit={(e) => { e.preventDefault(); if (draftId.trim()) setSelected(draftId.trim()); }}>
            <input value={draftId} onChange={(e) => setDraftId(e.target.value)} placeholder="round id" />
            <button type="submit" className="secondary" disabled={!draftId.trim()}>Open</button>
          </form>
        </div>

        <div>
          {!r && <div className="card muted">Choose a round, open a Draft by its id, or create one.</div>}
          {r && (
            <>
              <div className="card">
                <div className="row" data-testid="round-head">
                  <h2 style={{ margin: 0 }}>{r.name || '(unnamed)'}</h2>
                  <Badge solid={published}>{r.status}</Badge>
                  <code className="small muted">{r.id}</code>
                </div>
                {published && <p className="small muted">A Published round accepts only the changes of UC-03 AF-3{r.confirmedBookings !== undefined && <>; {r.confirmedBookings} confirmed bookings keep their table</>}.</p>}
                <div className="grid-2">
                  <label className="field">Name<input {...field('name')} /></label>
                  <label className="field">Artist<input {...field('artist')} /></label>
                  <label className="field">Date (venue local)<input type="date" {...field('date')} /></label>
                  <label className="field">Doors open<input type="datetime-local" {...field('doorsOpenAt')} /></label>
                  <label className="field">Start<input type="datetime-local" {...field('startAt')} /></label>
                  <label className="field">Booking opens (BRULE-07)<input type="datetime-local" {...field('bookingOpenAt')} /></label>
                  <label className="field">Zone map (Active)
                    <select {...field('zoneMapId')}><option value="">—</option>{activeMaps.data?.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.tables} tables)</option>)}</select>
                  </label>
                  <label className="field">Tables not for sale (numbers, comma-separated)<input {...field('tablesNotForSale')} placeholder="4, 12" /></label>
                </div>
                {r.checkInWindow && <p className="small muted">Check-in window: {fmtDateTime(r.checkInWindow.opensAt)} until {fmtDateTime(r.checkInWindow.graceEndsAt)} (BRULE-04, BRULE-05).</p>}

                <h3>Package price per zone and table type (BRULE-08)</h3>
                <table className="data" data-testid="prices">
                  <thead><tr><th>Zone</th><th>Table type</th><th>Price (THB)</th><th>Package content</th><th></th></tr></thead>
                  <tbody>
                    {form.prices.map((p, i) => (
                      <tr key={i}>
                        <td>{zoneName(p.zoneId)}</td>
                        <td>{typeName(p.tableTypeId)}</td>
                        <td className="tight"><input type="number" min={0} value={p.packagePrice ?? ''} onChange={(e) => setPrice(i, { packagePrice: e.target.value === '' ? undefined : Number(e.target.value) })} style={{ width: 100 }} /></td>
                        <td><input value={p.packageContent ?? ''} onChange={(e) => setPrice(i, { packageContent: e.target.value })} /></td>
                        <td className="tight"><button type="button" className="link" onClick={() => setForm((f) => ({ ...f, prices: f.prices.filter((_, j) => j !== i) }))}>remove</button></td>
                      </tr>
                    ))}
                    {form.prices.length === 0 && <tr><td colSpan={5} className="muted small">Choose a zone map: one row per zone and table type of the map appears here.</td></tr>}
                  </tbody>
                </table>
                <div className="row">
                  <button type="button" onClick={save} disabled={action.busy}>Save</button>
                  <button type="button" className="secondary" onClick={validate} disabled={action.busy}>Validate</button>
                  <button type="button" className="secondary" onClick={publish} disabled={action.busy}>Publish</button>
                  {!published && <button type="button" className="secondary" onClick={discard} disabled={action.busy}>Discard</button>}
                </div>
                {validation && (
                  <div className={validation.valid ? 'notice' : 'alert'} data-testid="validation">
                    {validation.valid ? 'The round is valid.' : 'The round is not valid:'}
                    {validation.problems && validation.problems.length > 0 && <ul className="problems">{validation.problems.map((p, i) => <li key={i}>{p}</li>)}</ul>}
                  </div>
                )}
                {r.parameters && (
                  <p className="small muted">Parameters snapshot at publish (FR-38): hold {r.parameters.holdPeriodMinutes} min · check-in window {r.parameters.checkInWindowHours} h · grace {r.parameters.gracePeriodMinutes} min · extra person {r.parameters.extraPersonFee} THB.</p>
                )}
              </div>

              <div className="card">
                <h4>Preview as the customer sees it (C3)</h4>
                {perZone.size > 0 && (
                  <table className="data" style={{ marginBottom: 12 }} data-testid="preview-summary">
                    <thead><tr><th>Zone</th><th className="num">Tables for sale</th><th className="num">Capacity</th></tr></thead>
                    <tbody>{[...perZone.entries()].map(([id, z]) => <tr key={id}><td>{z.name}</td><td className="num">{z.forSale}</td><td className="num">{z.capacity}</td></tr>)}</tbody>
                  </table>
                )}
                {preview.data && <TableGrid tables={preview.data} />}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
