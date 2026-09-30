import { useEffect, useState } from 'react';
import {
  api, type ApiError, Badge, type Booking, countByStatus, ErrorAlert, fmtDateTime, fmtTHB, poll, type RoundTable, type RoundTableStatus,
  statusMap, TableGrid, type UpcomingRound, useLoad,
} from '@seats/frontend-shared';

/** B4 Live view (UC-05; UC-02 step 7): the round, its table map with the status of every table polled every 2 s,
 *  the bookings of the round, and the counts of available, held, booked and occupied tables. */
export default function B4LiveView() {
  const rounds = useLoad(() => api.get<UpcomingRound[]>('/api/rounds'), []);
  const [roundId, setRoundId] = useState('');
  const [typed, setTyped] = useState('');
  const tables = useLoad<RoundTable[] | null>(() => (roundId ? api.get<RoundTable[]>(`/api/rounds/${roundId}/tables`) : Promise.resolve(null)), [roundId]);
  const bookings = useLoad<Booking[] | null>(() => (roundId ? api.get<Booking[]>(`/api/rounds/${roundId}/bookings`) : Promise.resolve(null)), [roundId]);
  const [status, setStatus] = useState<RoundTableStatus | null>(null);
  const [pollError, setPollError] = useState<ApiError | null>(null);
  const reloadBookings = bookings.reload;

  // The polled read (ADR-09); every change of the map also re-reads the bookings.
  useEffect(() => {
    setStatus(null);
    setPollError(null);
    if (!roundId) return;
    let first = true;
    return poll<RoundTableStatus>(`/api/rounds/${roundId}/table-status`, 2000, (s) => { setStatus(s); setPollError(null); if (first) first = false; else reloadBookings(); }, setPollError);
  }, [roundId, reloadBookings]);

  const counts = countByStatus(status);
  const checkedInAt = (b: Booking) => b.history?.find((h) => h.status === 'Checked-in')?.at;

  return (
    <>
      <h1>Live view</h1>
      <ErrorAlert error={rounds.error} />
      <ErrorAlert error={tables.error} />
      <ErrorAlert error={bookings.error} />
      <ErrorAlert error={pollError} />
      <div className="card">
        <div className="row">
          <label>Round&nbsp;
            <select value={roundId} onChange={(e) => setRoundId(e.target.value)}>
              <option value="">— choose —</option>
              {rounds.data?.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.date} · {r.status}</option>)}
            </select>
          </label>
          <span className="small muted">or a round id (KI-17):</span>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="round id" />
          <button type="button" className="secondary" onClick={() => setRoundId(typed.trim())} disabled={!typed.trim()}>Open</button>
        </div>
        {roundId && (
          <div className="counts">
            <div><strong>{counts.AVAILABLE}</strong>available</div>
            <div><strong>{counts.HELD}</strong>held</div>
            <div><strong>{counts.BOOKED}</strong>booked</div>
            <div><strong>{counts.OCCUPIED}</strong>occupied</div>
            <div><strong>{counts.NOT_FOR_SALE}</strong>not for sale</div>
            <div><strong>{status?.version ?? '–'}</strong>map version</div>
          </div>
        )}
        {tables.data && <TableGrid tables={tables.data} status={statusMap(status)} />}
      </div>
      {roundId && (
        <div className="card">
          <h4>Bookings of the round</h4>
          {bookings.data?.length === 0 && <p className="muted small">No booking yet.</p>}
          {bookings.data && bookings.data.length > 0 && (
            <table className="data">
              <thead><tr><th>Booking</th><th>Table</th><th>Customer</th><th>Status</th><th>Party size</th><th>Fee</th><th>Hold ends</th><th>Checked in</th></tr></thead>
              <tbody>
                {bookings.data.map((b) => (
                  <tr key={b.id}>
                    <td><code>{b.id}</code></td>
                    <td>#{b.tableNumber} · {b.zoneName ?? b.zoneId}</td>
                    <td><code>{b.customerId}</code></td>
                    <td><Badge solid={b.status === 'Confirmed' || b.status === 'Checked-in'}>{b.status}</Badge></td>
                    <td>{b.partySize ?? '–'}</td>
                    <td>{fmtTHB(b.fee?.fullTableFee)}</td>
                    <td className="small">{b.status === 'Held' ? fmtDateTime(b.holdEndsAt) : '–'}</td>
                    <td className="small">{fmtDateTime(checkedInAt(b))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
