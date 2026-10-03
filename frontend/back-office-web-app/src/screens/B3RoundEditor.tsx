import { type FormEvent, useEffect, useState } from 'react';
import {
  api, Badge, ErrorAlert, fmtTHB, fmtTime, fromLocalInput, type PackagePrice, type Removed, type Round, type RoundTable, type RoundUpdate,
  TableGrid, tableLabel, type TableType, toLocalInput, type UpcomingRound, useAction, useLoad, type ValidationResult, type ZoneMap, type ZoneMapSummary,
} from '@seats/frontend-shared';
import { fmtDay, fmtWhen, ValidationBox } from '../parts';

interface Form { name: string; artist: string; date: string; doorsOpenAt: string; startAt: string; bookingOpenAt: string; zoneMapId: string; tablesNotForSale: number[]; prices: PackagePrice[] }
const EMPTY: Form = { name: '', artist: '', date: '', doorsOpenAt: '', startAt: '', bookingOpenAt: '', zoneMapId: '', tablesNotForSale: [], prices: [] };
const hours = (from: string | undefined, to: string | undefined): number => Math.round(((new Date(to ?? 0).getTime() - new Date(from ?? 0).getTime()) / 3600e3) * 10) / 10;
const minutes = (from: string | undefined, to: string | undefined): number => Math.round((new Date(to ?? 0).getTime() - new Date(from ?? 0).getTime()) / 60e3);

/** B3 Round editor (UC-03, Table D.12), laid out as the wireframe: the round list at the left; in the middle the
 *  Concert details, the Zone map with the tables not for sale as chips, and the tables for sale and capacity per
 *  zone; at the right the package price and content per zone and table type as a matrix, the validation result, the
 *  preview as the Customer sees it (C3), and Save draft, Validate, Preview, Publish (open once the saved round passes
 *  validation; Validate saves the draft first), Discard. */
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
  const [dirty, setDirty] = useState(false);
  const zoneMap = useLoad<ZoneMap | null>(() => (form.zoneMapId ? api.get<ZoneMap>(`/api/zone-maps/${form.zoneMapId}`) : Promise.resolve(null)), [form.zoneMapId]);
  const preview = useLoad<RoundTable[] | null>(() => (selected ? api.get<RoundTable[]>(`/api/rounds/${selected}/tables`) : Promise.resolve(null)), [selected, round.data]);
  const [showPreview, setShowPreview] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const action = useAction();

  useEffect(() => {
    const r = round.data;
    if (!r) { setForm(EMPTY); setValidation(null); setDirty(false); setShowPreview(false); return; }
    setForm({
      name: r.name ?? '', artist: r.artist ?? '', date: r.date ?? '', doorsOpenAt: toLocalInput(r.doorsOpenAt), startAt: toLocalInput(r.startAt),
      bookingOpenAt: toLocalInput(r.bookingOpenAt), zoneMapId: r.zoneMapId ?? '', tablesNotForSale: r.tablesNotForSale ?? [], prices: r.prices ?? [],
    });
    setValidation(null);
    setDirty(false);
  }, [round.data]);

  // every local change invalidates the last validation result (Publish closes again until the next pass)
  const edit = (fn: (f: Form) => Form) => { setForm(fn); setDirty(true); setValidation(null); };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const created = await action.run(() => api.post<Round>('/api/rounds', { name: newName.trim() || undefined }));
    if (created?.id) { setNewName(''); setSelected(created.id); }
  };
  const save = async (): Promise<Round | undefined> => {
    const body: RoundUpdate = {
      name: form.name || undefined, artist: form.artist || undefined, date: form.date || undefined, doorsOpenAt: fromLocalInput(form.doorsOpenAt),
      startAt: fromLocalInput(form.startAt), bookingOpenAt: fromLocalInput(form.bookingOpenAt), zoneMapId: form.zoneMapId || undefined,
      tablesNotForSale: form.tablesNotForSale, prices: form.prices.filter((p) => p.packagePrice !== undefined && Number.isFinite(p.packagePrice)),
    };
    const saved = await action.run(() => api.put<Round>(`/api/rounds/${selected}`, body));
    if (saved) { round.setData(saved); rounds.reload(); }
    return saved;
  };
  const validate = async () => {
    if (dirty && !(await save())) return;
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
  const togglePreview = () => { if (!showPreview) preview.reload(); setShowPreview(!showPreview); };

  const field = (key: keyof Omit<Form, 'prices' | 'tablesNotForSale'>) => ({ value: form[key], onChange: (e: { target: { value: string } }) => edit((f) => ({ ...f, [key]: e.target.value })) });
  const setPrice = (zoneId: string, tableTypeId: string, patch: Partial<PackagePrice>) => edit((f) => {
    const i = f.prices.findIndex((p) => p.zoneId === zoneId && p.tableTypeId === tableTypeId);
    const prices = i >= 0 ? f.prices.map((p, j) => (j === i ? { ...p, ...patch } : p)) : [...f.prices, { zoneId, tableTypeId, ...patch }];
    return { ...f, prices };
  });
  const mark = (n: number) => edit((f) => ({ ...f, tablesNotForSale: f.tablesNotForSale.includes(n) ? f.tablesNotForSale : [...f.tablesNotForSale, n].sort((a, b) => a - b) }));
  const unmark = (n: number) => edit((f) => ({ ...f, tablesNotForSale: f.tablesNotForSale.filter((x) => x !== n) }));

  const r = round.data;
  const published = r?.status === 'Published';
  const mapZones = zoneMap.data?.zones ?? [];
  const mapTables = zoneMap.data?.tables ?? [];
  const typeName = (id: string | undefined) => types.data?.find((t) => t.id === id)?.name ?? id ?? '';
  const zoneTitle = (z: { id?: string; name?: string }) => `Zone ${(z.id ?? '').toUpperCase()}${z.name ? ` · ${z.name}` : ''}`;
  const zoneOf = (n: number) => mapTables.find((t) => t.tableNumber === n)?.zoneId;
  const occurs = (zoneId: string | undefined, typeId: string) => mapTables.some((t) => t.zoneId === zoneId && t.tableTypeId === typeId);
  const matrixTypes = (types.data ?? []).filter((ty) => mapTables.some((t) => t.tableTypeId === ty.id));
  const unmarked = mapTables.filter((t) => t.tableNumber !== undefined && !form.tablesNotForSale.includes(t.tableNumber));
  // the tables for sale and the seats of each zone, from the chosen map and the tables marked not for sale
  const perZone = mapZones.map((z) => {
    const ts = mapTables.filter((t) => t.zoneId === z.id);
    const forSale = ts.filter((t) => t.tableNumber === undefined || !form.tablesNotForSale.includes(t.tableNumber));
    return { zone: z, total: ts.length, forSale: forSale.length, seats: forSale.reduce((s, t) => s + (t.capacity ?? 0), 0) };
  });
  const total = perZone.reduce((a, z) => ({ forSale: a.forSale + z.forSale, seats: a.seats + z.seats }), { forSale: 0, seats: 0 });
  const w = r?.checkInWindow;

  const item = (id: string | undefined, name: string | undefined, when: string, status: 'Draft' | 'Published') => (
    <button key={id} type="button" className={`it${id === selected ? ' cur' : ''}`} onClick={() => setSelected(id ?? null)} data-testid={id === selected ? 'round-head' : undefined}>
      <div className="name">{name || '(unnamed)'}</div>
      <div className="tiny">{when}</div>
      <Badge fill={status === 'Published'}>{status}</Badge>
    </button>
  );

  return (
    <>
      <ErrorAlert error={rounds.error} />
      <ErrorAlert error={activeMaps.error} />
      <ErrorAlert error={types.error} />
      <ErrorAlert error={round.error} />
      <ErrorAlert error={zoneMap.error} />
      <ErrorAlert error={preview.error} />
      <ErrorAlert error={action.error} onClose={action.clear} />
      <div className="cols">
        {/* ---- the list of rounds */}
        <div className="list" style={{ width: 170, flex: 'none' }}>
          <h1 className="hd">Concert rounds</h1>
          <form onSubmit={create}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New round name" aria-label="New round name" />
            <button type="submit" className="small wide" disabled={action.busy}>+ New round</button>
          </form>
          {r && !rounds.data?.some((u) => u.id === r.id) && item(r.id, r.name, fmtWhen(r.date, r.startAt), r.status ?? 'Draft')}
          {rounds.data?.map((u) => item(u.id, u.name, fmtWhen(u.date, u.startAt), 'Published'))}
          {rounds.data?.length === 0 && !r && <div className="tiny">No Published round yet.</div>}
          <div className="idbox">
            <div className="tiny" style={{ marginBottom: 3 }}>Open a Draft by id (KI-17)</div>
            <form onSubmit={(e) => { e.preventDefault(); if (draftId.trim()) setSelected(draftId.trim()); }}>
              <input value={draftId} onChange={(e) => setDraftId(e.target.value)} placeholder="round id" aria-label="round id" style={{ flex: 1, minWidth: 0, fontSize: 11.5 }} />
              <button type="submit" className="small" disabled={!draftId.trim()}>Open</button>
            </form>
          </div>
        </div>

        {!r && <div className="placeholder grow" style={{ height: 200, borderRadius: 6 }}>Choose a round, open a Draft by its id, or create one.</div>}
        {r && (
          <>
            {/* ---- the details, the zone map, the tables for sale */}
            <div style={{ width: 312, flex: 'none' }}>
              <div className="panel">
                <div className="pt">Concert details</div>
                <div className="frow"><label className="fl" htmlFor="rd-name">Name</label><input id="rd-name" {...field('name')} /></div>
                <div className="frow"><label className="fl" htmlFor="rd-artist">Artist</label><input id="rd-artist" {...field('artist')} /></div>
                <div className="frow"><label className="fl" htmlFor="rd-date">Date</label><input id="rd-date" type="date" {...field('date')} /></div>
                <div className="frow"><label className="fl" htmlFor="rd-doors">Doors open</label><input id="rd-doors" type="datetime-local" {...field('doorsOpenAt')} /></div>
                <div className="frow"><label className="fl" htmlFor="rd-start">Start</label><input id="rd-start" type="datetime-local" {...field('startAt')} /></div>
                <div className="frow"><label className="fl" htmlFor="rd-open">Booking opens</label><input id="rd-open" type="datetime-local" {...field('bookingOpenAt')} /></div>
                {w && (
                  <div className="tiny" style={{ marginTop: 6 }}>
                    Check-in window <b>{fmtTime(w.opensAt)}–{fmtTime(w.graceEndsAt)}</b>: from {hours(w.opensAt, w.startAt)} h before the start until {minutes(w.startAt, w.graceEndsAt)} min after it (business parameters).
                  </div>
                )}
                {!w && <div className="tiny" style={{ marginTop: 6 }}>The check-in window follows from the start time and the business parameters once the draft is saved.</div>}
                {published && <div className="tiny" style={{ marginTop: 4 }}>A Published round accepts only the changes of UC-03 AF-3{r.confirmedBookings !== undefined && <>; {r.confirmedBookings} confirmed bookings keep their table</>}.</div>}
                {r.parameters && (
                  <div className="tiny" style={{ marginTop: 4 }}>Parameters snapshot at publish (FR-38): hold {r.parameters.holdPeriodMinutes} min · check-in window {r.parameters.checkInWindowHours} h · grace {r.parameters.gracePeriodMinutes} min · extra person {r.parameters.extraPersonFee} THB.</div>
                )}
              </div>

              <div className="panel">
                <div className="pt">Zone map</div>
                <div className="frow">
                  <label className="fl" htmlFor="rd-map">Zone map</label>
                  <select id="rd-map" {...field('zoneMapId')}>
                    <option value="">—</option>
                    {activeMaps.data?.map((m) => <option key={m.id} value={m.id}>{m.name} (Active, {m.tables} tables)</option>)}
                  </select>
                </div>
                <div className="tiny" style={{ margin: '6px 0 3px' }}>Tables not for sale in this round</div>
                <div data-testid="not-for-sale">
                  {form.tablesNotForSale.map((n) => (
                    <button key={n} type="button" className="chip" onClick={() => unmark(n)} title="put this table back for sale" aria-label={`table ${tableLabel(zoneOf(n), n)} not for sale, remove`}>{tableLabel(zoneOf(n), n)} ×</button>
                  ))}
                  <select className="chip add" value="" onChange={(e) => { if (e.target.value) mark(Number(e.target.value)); }} aria-label="mark a table not for sale" disabled={!zoneMap.data || unmarked.length === 0}>
                    <option value="">+ mark a table</option>
                    {unmarked.map((t) => <option key={t.tableNumber} value={t.tableNumber}>{tableLabel(t.zoneId, t.tableNumber)} · {typeName(t.tableTypeId)}</option>)}
                  </select>
                </div>
              </div>

              <div className="panel">
                <div className="pt">Tables for sale and capacity per zone</div>
                <table className="tbl" data-testid="sale-summary">
                  <thead><tr><th>Zone</th><th className="num">For sale</th><th className="num">Seats</th></tr></thead>
                  <tbody>
                    {perZone.map((z) => <tr key={z.zone.id}><td>{zoneTitle(z.zone)}</td><td className="num">{z.forSale} of {z.total}</td><td className="num">{z.seats}</td></tr>)}
                    {perZone.length === 0 && <tr><td colSpan={3} className="tiny">Choose a zone map.</td></tr>}
                    {perZone.length > 0 && <tr><td><b>Total</b></td><td className="num"><b>{total.forSale}</b></td><td className="num"><b>{total.seats}</b></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ---- the prices, the validation, the preview, the buttons */}
            <div className="grow" style={{ minWidth: 300 }}>
              <div className="panel">
                <div className="pt">Package price and content per zone and table type</div>
                <table className="tbl" data-testid="prices">
                  <thead>
                    <tr><th style={{ width: 120 }}>Table type</th>{mapZones.map((z) => <th key={z.id}>{zoneTitle(z)}</th>)}</tr>
                  </thead>
                  <tbody>
                    {matrixTypes.map((ty) => (
                      <tr key={ty.id}>
                        <td>{ty.name}</td>
                        {mapZones.map((z) => {
                          if (!occurs(z.id, ty.id)) return <td key={z.id}><span className="tiny">none in this zone</span></td>;
                          const p = form.prices.find((x) => x.zoneId === z.id && x.tableTypeId === ty.id);
                          const missing = p?.packagePrice === undefined;
                          return (
                            <td key={z.id} className={`cell-stack${missing ? ' err' : ''}`}>
                              <input type="number" min={0} className="price" value={p?.packagePrice ?? ''} placeholder="price missing" aria-label={`price of ${ty.name} in ${zoneTitle(z)}, THB`}
                                onChange={(e) => setPrice(z.id ?? '', ty.id, { packagePrice: e.target.value === '' ? undefined : Number(e.target.value) })} />
                              <input value={p?.packageContent ?? ''} placeholder="package content" aria-label={`package content of ${ty.name} in ${zoneTitle(z)}`}
                                onChange={(e) => setPrice(z.id ?? '', ty.id, { packageContent: e.target.value })} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {matrixTypes.length === 0 && <tr><td colSpan={1 + mapZones.length} className="tiny">Choose a zone map: one row per table type of the map and one column per zone appear here (BRULE-08).</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="cols" style={{ marginTop: 10 }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  {validation
                    ? <ValidationBox result={validation} hint={!validation.valid ? 'Publish opens once the round passes validation.' : published ? `The round is valid and Published; no other Published round overlaps ${fmtDay(form.date)}.` : `Times are in order and no Published round overlaps ${fmtDay(form.date)}. Publish is open.`} />
                    : <div className="tiny" style={{ marginTop: 10 }}>{published ? 'This round is Published; the Customer can book it.' : `Validate ${dirty ? 'saves the draft and ' : ''}checks the times, the map and the prices; Publish opens once the round passes.`}</div>}
                </div>
                <button type="button" className="placeholder preview-box" onClick={togglePreview} aria-pressed={showPreview} title="the table map as the Customer sees it (C3)">
                  Preview:<br />as the Customer<br />sees it (C3)
                </button>
              </div>
              {showPreview && (
                <div className="panel" data-testid="preview" style={{ marginTop: 10 }}>
                  <div className="pt">Preview: as the Customer sees it (C3){dirty ? <span className="tiny"> · of the saved draft</span> : null}</div>
                  {preview.data && (
                    <TableGrid tables={preview.data} size={0.85}
                      zoneFooter={(z) => {
                        const lines = new Map<string, string>();
                        for (const t of z.tables) if (t.forSale !== false && t.tableTypeId && !lines.has(t.tableTypeId)) lines.set(t.tableTypeId, `${t.tableTypeName ?? t.tableTypeId} ${fmtTHB(t.packagePrice)}`);
                        return <div className="tiny">{[...lines.values()].join(' · ') || 'no table for sale'}</div>;
                      }} />
                  )}
                </div>
              )}

              <div className="btnrow">
                <button type="button" onClick={save} disabled={action.busy}>{published ? 'Save' : 'Save draft'}</button>
                <button type="button" onClick={validate} disabled={action.busy}>Validate</button>
                <button type="button" onClick={togglePreview} aria-pressed={showPreview}>Preview</button>
                <button type="button" className="primary" onClick={publish} disabled={action.busy || published || !validation?.valid}>Publish</button>
                {!published && <button type="button" onClick={discard} disabled={action.busy}>Discard</button>}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
