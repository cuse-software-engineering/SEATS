import { useEffect, useState } from 'react';
import {
  api, type ApiError, type Booking, countByStatus, ErrorAlert, fmtTime, poll, type RoundTable, type RoundTableStatus, statusMap,
  StatusLegend, TableGrid, tableLabel, type UpcomingRound, useLoad, useSession,
} from '@seats/frontend-shared';
import { fmtClock, fmtWhen, plural } from '../parts';

/** B4 Live view (UC-05; UC-02 step 7; Table D.13), laid out as the wireframe: the round at the top left and the
 *  refresh clock at the right; the table map with the status of every table polled every 2 s on the left, with the
 *  legend and the counts of available, held, booked and occupied tables under it; the bookings of the round at the
 *  right (the name is the customer id in progress 1). */
export default function B4LiveView() {
  const session = useSession();
  const rounds = useLoad(() => api.get<UpcomingRound[]>('/api/rounds'), []);
  const [roundId, setRoundId] = useState('');
  const [typed, setTyped] = useState('');
  const canList = session?.role === 'manager' || session?.role === 'owner';   // GET /rounds/{id}/bookings is manager and owner only
  const tables = useLoad<RoundTable[] | null>(() => (roundId ? api.get<RoundTable[]>(`/api/rounds/${roundId}/tables`) : Promise.resolve(null)), [roundId]);
  const bookings = useLoad<Booking[] | null>(() => (roundId && canList ? api.get<Booking[]>(`/api/rounds/${roundId}/bookings`) : Promise.resolve(null)), [roundId, canList]);
  const [status, setStatus] = useState<RoundTableStatus | null>(null);
  const [pollError, setPollError] = useState<ApiError | null>(null);
  const [last, setLast] = useState<Date | null>(null);
  const reloadBookings = bookings.reload;

  // The polled read (ADR-09): a change of the map also re-reads the bookings; the clock ticks with the poll.
  useEffect(() => {
    setStatus(null);
    setPollError(null);
    setLast(null);
    if (!roundId) return;
    let first = true;
    const stop = poll<RoundTableStatus>(`/api/rounds/${roundId}/table-status`, 2000, (s) => { setStatus(s); setPollError(null); setLast(new Date()); if (first) first = false; else reloadBookings(); }, setPollError);
    const clock = setInterval(() => setLast((l) => (l ? new Date() : l)), 2000);
    return () => { stop(); clearInterval(clock); };
  }, [roundId, reloadBookings]);

  const counts = countByStatus(status);
  const totalTables = status?.tables?.length ?? tables.data?.length ?? 0;
  const checkIn = (b: Booking) => b.history?.find((h) => h.status === 'Checked-in');
  const confirmed = bookings.data?.filter((b) => b.status === 'Confirmed' || b.status === 'Checked-in').length ?? 0;
  const checkedIn = bookings.data?.filter((b) => b.status === 'Checked-in').length ?? 0;

  return (
    <div className="live">
      <ErrorAlert error={rounds.error} />
      <ErrorAlert error={tables.error} />
      <ErrorAlert error={bookings.error} />
      <ErrorAlert error={pollError} />
      <div className="row" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <label className="tiny" htmlFor="live-round" style={{ fontSize: 12.5, color: '#555' }}>Round</label>
          <select id="live-round" value={roundId} onChange={(e) => { setRoundId(e.target.value); setTyped(''); }} style={{ width: 330, maxWidth: '100%' }}>
            <option value="">— choose a round —</option>
            {rounds.data?.map((r) => <option key={r.id} value={r.id}>{fmtWhen(r.date, r.startAt)} · {r.artist || r.name}</option>)}
            {roundId && !rounds.data?.some((r) => r.id === roundId) && <option value={roundId}>round {roundId}</option>}
          </select>
          <span className="tiny">or a round id (KI-17)</span>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="round id" aria-label="round id" style={{ width: 120, fontSize: 11.5 }} />
          <button type="button" className="small" onClick={() => setRoundId(typed.trim())} disabled={!typed.trim()}>Open</button>
        </span>
        <span className="tiny">Refreshed every 2 s · last {last ? fmtClock(last) : '–'}{status?.version !== undefined ? ` · map version ${status.version}` : ''}</span>
      </div>
      {!roundId && <div className="placeholder" style={{ height: 200, borderRadius: 6 }}>Choose a round to watch its tables.</div>}
      {roundId && (
        <div className="cols">
          <div style={{ width: 522, flex: 'none', maxWidth: '100%' }}>
            {tables.data && <TableGrid tables={tables.data} status={statusMap(status)} />}
            <StatusLegend statuses={['AVAILABLE', 'HELD', 'BOOKED', 'OCCUPIED']} labels={{ AVAILABLE: 'Available', HELD: 'Held', BOOKED: 'Booked', OCCUPIED: 'Occupied (checked in)' }} />
            <div className="counts" data-testid="counts">
              <span>Available <b>{counts.AVAILABLE}</b></span>
              <span>Held <b>{counts.HELD}</b></span>
              <span>Booked <b>{counts.BOOKED}</b></span>
              <span>Occupied <b>{counts.OCCUPIED}</b></span>
              <span className="plain">of {plural(totalTables, 'table')}{counts.NOT_FOR_SALE ? ` · ${counts.NOT_FOR_SALE} not for sale` : ''}</span>
            </div>
          </div>
          <div className="grow">
            <div className="pt">Bookings of the round</div>
            {!canList && <div className="tiny">The bookings of a round are listed for the Manager and the Owner.</div>}
            {bookings.data && (
              <table className="tbl" data-testid="bookings">
                <thead><tr><th style={{ width: 52 }}>Table</th><th>Name</th><th className="num" style={{ width: 48 }}>Party</th><th style={{ width: 82 }}>Status</th><th style={{ width: 96 }}>Checked in</th></tr></thead>
                <tbody>
                  {bookings.data.map((b) => {
                    const c = checkIn(b);
                    return (
                      <tr key={b.id}>
                        <td>{tableLabel(b.zoneId, b.tableNumber)}</td>
                        <td>{b.customerId}{b.status === 'Held' && <span className="tiny"> (paying)</span>}</td>
                        <td className="num">{b.partySize ?? '–'}</td>
                        <td>{b.status}</td>
                        <td>{c ? `${fmtTime(c.at)}${c.by ? ` ${c.by}` : ''}` : '–'}</td>
                      </tr>
                    );
                  })}
                  {bookings.data.length === 0 && <tr><td colSpan={5} className="tiny">No booking yet.</td></tr>}
                </tbody>
              </table>
            )}
            {bookings.data && bookings.data.length > 0 && (
              <div className="tiny" style={{ marginTop: 6 }}>{plural(bookings.data.length, 'booking')}. Checked in {checkedIn} of {confirmed} confirmed.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
