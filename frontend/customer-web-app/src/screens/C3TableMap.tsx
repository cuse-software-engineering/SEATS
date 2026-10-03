import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  api, type ApiError, type Booking, ErrorAlert, poll, type Round, type RoundTable, type RoundTableStatus, SHAPE_SYMBOL, shapeOf,
  StatusLegend, statusMap, TableGrid, tableLabel, toApiError, useLoad,
} from '@seats/frontend-shared';
import { Screen } from '../Screen';
import { roundTitle, zoneLabel } from '../format';

/** "Zone A: ○ 2 p 2,400 · □ 4 p 4,800 · sofa 6 p 7,200 THB": the table types of each zone with their package price. */
function priceLines(tables: RoundTable[]): { zone: string; line: string }[] {
  const zones = new Map<string, Map<string, { shape: string; capacity: number; price?: number }>>();
  for (const t of tables) {
    if (t.forSale === false) continue;
    const zone = t.zoneId ?? '';
    const entry = { shape: SHAPE_SYMBOL[shapeOf(t)], capacity: t.capacity ?? 0, price: t.packagePrice };
    const key = `${entry.shape}|${entry.capacity}|${entry.price ?? ''}`;
    if (!zones.has(zone)) zones.set(zone, new Map());
    zones.get(zone)!.set(key, entry);
  }
  return [...zones.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([zone, types]) => ({
    zone,
    line: [...types.values()].sort((a, b) => a.capacity - b.capacity || (a.price ?? 0) - (b.price ?? 0))
      .map((t) => `${t.shape} ${t.capacity} p${t.price !== undefined ? ` ${t.price.toLocaleString('en-US')}` : ''}`).join(' · ') + ' THB',
  }));
}

/** C3 Table map (UC-01 steps 5–8, AF-3): the tables of the round with their live status, polled every 2 s (ADR-09);
 *  a tap on an available table holds it (POST /api/bookings) and opens C4. A hold refused with 409 (the table was
 *  just taken) shows the toast of AF-3 while the map refreshes; any other failure keeps the alert box. */
export default function C3TableMap() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const round = useLoad(() => api.get<Round>(`/api/rounds/${id}`), [id]);
  const tables = useLoad(() => api.get<RoundTable[]>(`/api/rounds/${id}/tables`), [id]);
  const [status, setStatus] = useState<RoundTableStatus | null>(null);
  const [pollError, setPollError] = useState<ApiError | null>(null);
  const [holdError, setHoldError] = useState<ApiError | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => poll<RoundTableStatus>(`/api/rounds/${id}/table-status`, 2000, (s) => { setStatus(s); setPollError(null); }, setPollError), [id]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const pick = async (t: RoundTable) => {
    setBusy(true);
    setHoldError(null);
    try {
      const booking = await api.post<Booking>('/api/bookings', { roundId: id, tableNumber: t.tableNumber });
      if (booking.id) navigate(`/bookings/${booking.id}`);
    } catch (e) {
      const err = toApiError(e);
      if (err.status === 409) setToast(`Table ${tableLabel(t.zoneId, t.tableNumber)} was just taken by another customer. The map has been refreshed.`);
      else setHoldError(err);
    } finally {
      setBusy(false);
    }
  };

  const r = round.data;
  const holdMinutes = r?.holdPeriodMinutes ?? r?.parameters?.holdPeriodMinutes ?? 15;
  const extraFee = r?.parameters?.extraPersonFee;
  return (
    <Screen title={r ? `${roundTitle(r, false)} · ${r.artist ?? r.name ?? ''}` : 'Table map'} back="/" padTop={8}>
      <div className="row">
        <span className="muted">Zone map · refreshed live</span>
        <span className="tiny">{busy ? 'Holding the table…' : 'Tap an available table'}</span>
      </div>
      <ErrorAlert error={round.error} />
      <ErrorAlert error={tables.error} />
      <ErrorAlert error={pollError} />
      <ErrorAlert error={holdError} onClose={() => setHoldError(null)} />
      <div data-testid="table-map">
        {tables.data && <TableGrid tables={tables.data} status={statusMap(status)} onPick={pick} busy={busy} size={0.88} />}
      </div>
      <StatusLegend labels={{ AVAILABLE: 'Available', HELD: `Held (${holdMinutes} min)`, BOOKED: 'Booked' }} />
      {tables.data && (
        <div className="tiny" data-testid="price-lines">
          {priceLines(tables.data).map((p) => <div key={p.zone}>{zoneLabel(p.zone)}: {p.line}</div>)}
          {extraFee !== undefined && <div>Extra person +{extraFee.toLocaleString('en-US')} THB each (added with the party size)</div>}
        </div>
      )}
      {toast && <div className="toast" role="alert" data-testid="toast">{toast}</div>}
    </Screen>
  );
}
