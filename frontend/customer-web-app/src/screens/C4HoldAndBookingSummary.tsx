import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, Badge, type Booking, ErrorAlert, fmtDate, fmtDateTime, fmtTHB, mmss, type Round, useAction, useLoad } from '@seats/frontend-shared';

/** C4 Hold and booking summary (UC-01 steps 8–11, AF-4, EF-1): the hold countdown, the party size stepper, the
 *  fee with the full table fee, Cancel the hold. The round is read for its name and date. */
export default function C4HoldAndBookingSummary() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const booking = useLoad(() => api.get<Booking>(`/api/bookings/${id}`), [id]);
  const roundId = booking.data?.roundId;
  const round = useLoad(() => (roundId ? api.get<Round>(`/api/rounds/${roundId}`) : Promise.resolve(null)), [roundId]);
  const action = useAction();
  const [remaining, setRemaining] = useState<number | null>(null);

  // The countdown runs locally from remainingHoldSeconds; at zero the booking is read again (Expired, EF-1).
  useEffect(() => {
    if (!booking.data) return;
    setRemaining(booking.data.status === 'Held' ? booking.data.remainingHoldSeconds ?? 0 : null);
  }, [booking.data]);
  useEffect(() => {
    if (remaining === null || remaining <= 0) return;
    const timer = setInterval(() => setRemaining((r) => (r === null ? null : r - 1)), 1000);
    return () => clearInterval(timer);
  }, [remaining !== null && remaining > 0]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (remaining === 0 && booking.data?.status === 'Held') booking.reload(); }, [remaining]);   // eslint-disable-line react-hooks/exhaustive-deps

  const b = booking.data;
  const held = b?.status === 'Held' && (remaining ?? 0) > 0;
  const size = b?.partySize ?? b?.capacity ?? 1;

  const setSize = async (partySize: number) => {
    const updated = await action.run(() => api.put<Booking>(`/api/bookings/${id}/party-size`, { partySize }));
    if (updated) booking.setData(updated);
  };
  const cancel = async () => {
    const cancelled = await action.run(() => api.post<Booking>(`/api/bookings/${id}/cancel`));
    if (cancelled) navigate(`/rounds/${cancelled.roundId ?? ''}`);
  };

  return (
    <>
      <h1>Your hold</h1>
      <ErrorAlert error={booking.error} />
      <ErrorAlert error={round.error} />
      <ErrorAlert error={action.error} onClose={action.clear} />
      {b && (
        <>
          <div className="card">
            {held && (
              <>
                <h4>Time left to complete the booking</h4>
                <div className="countdown">{mmss(remaining ?? 0)}</div>
                <p className="small muted">Table {b.tableNumber} is held for you until {fmtDateTime(b.holdEndsAt)} (BRULE-02).</p>
              </>
            )}
            {b.status === 'Held' && !held && (
              <div className="notice">Your hold has ended and the table was released (UC-01 EF-1). <Link to={`/rounds/${b.roundId ?? ''}`}>Choose a table again</Link>.</div>
            )}
            {b.status === 'Expired' && (
              <div className="notice">Your hold expired and the table was released (UC-01 EF-1). <Link to={`/rounds/${b.roundId ?? ''}`}>Choose a table again</Link>.</div>
            )}
            {b.status !== 'Held' && b.status !== 'Expired' && <p>This booking is <Badge solid>{b.status}</Badge>.</p>}
          </div>

          <div className="card">
            <h4>Booking summary</h4>
            <table className="data">
              <tbody>
                <tr><th>Round</th><td>{round.data ? `${round.data.name ?? ''} · ${round.data.artist ?? ''} · ${fmtDate(round.data.date)}` : b.roundId}</td></tr>
                <tr><th>Table</th><td>#{b.tableNumber} · {b.zoneName ?? b.zoneId} · {b.tableTypeId} · {b.capacity} seats</td></tr>
                <tr><th>Booking</th><td><code>{b.id}</code> <Badge>{b.status}</Badge></td></tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <h4>Party size</h4>
            <div className="row">
              <div className="stepper">
                <button type="button" onClick={() => setSize(size - 1)} disabled={!held || action.busy || size <= 1} aria-label="fewer">−</button>
                <span>{size}</span>
                <button type="button" onClick={() => setSize(size + 1)} disabled={!held || action.busy} aria-label="more">+</button>
              </div>
              {b.partySize === undefined && held && <button type="button" className="secondary" onClick={() => setSize(size)} disabled={action.busy}>Set {size} people</button>}
              <span className="small muted">above the {b.capacity} seats of the table, each person adds the extra-person fee (BRULE-09)</span>
            </div>
            <h4>Fee</h4>
            {b.fee ? (
              <table className="data">
                <tbody>
                  <tr><td>Package price (BRULE-08)</td><td className="num">{fmtTHB(b.fee.packagePrice)}</td></tr>
                  <tr><td>Extra persons: {b.fee.extraPersons ?? 0} × {fmtTHB(b.fee.extraPersonFee)}</td><td className="num">{fmtTHB((b.fee.extraPersons ?? 0) * (b.fee.extraPersonFee ?? 0))}</td></tr>
                  <tr><th>Full table fee (BRULE-01)</th><th className="num">{fmtTHB(b.fee.fullTableFee)}</th></tr>
                </tbody>
              </table>
            ) : <p className="muted small">Set the party size to see the full table fee.</p>}
          </div>

          <div className="row">
            <button type="button" onClick={() => navigate(`/bookings/${id}/profile`)} disabled={!held || !b.fee || action.busy}>Continue</button>
            <button type="button" className="secondary" onClick={cancel} disabled={b.status !== 'Held' || action.busy}>Cancel the hold</button>
          </div>
        </>
      )}
    </>
  );
}
