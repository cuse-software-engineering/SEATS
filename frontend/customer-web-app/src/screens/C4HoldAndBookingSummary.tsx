import { useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, Badge, type Booking, type BookingStatus, ErrorAlert, mmss, tableLabel, useAction } from '@seats/frontend-shared';
import { Screen } from '../Screen';
import { extraPersons, fmtClock, roundTitle, thb, typeLabel, zoneLabel } from '../format';
import { useHeldBooking, useRoundOf } from '../hooks';

const TITLE: Partial<Record<BookingStatus, string>> = { Held: 'Your table is held', Expired: 'Hold expired', Cancelled: 'Booking cancelled', Confirmed: 'Booking confirmed', 'Checked-in': 'Checked in' };

/** C4 Hold and booking summary (UC-01 steps 8–11, AF-4, EF-1): the hold countdown in the app bar, the booking
 *  summary, the party size stepper, the fee with the full table fee, Continue and Cancel hold. A fresh hold has no
 *  party size yet: the screen sets it to the table's capacity once, so the stepper and the fee start from there
 *  (step 10 is the customer's change of it). */
export default function C4HoldAndBookingSummary() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { booking, remaining, held } = useHeldBooking(id);
  const { round, table } = useRoundOf(booking.data);
  const action = useAction();

  const b = booking.data;
  const r = round.data;
  const size = b?.partySize ?? b?.capacity ?? 1;
  const extraFee = b?.fee?.extraPersonFee ?? r?.parameters?.extraPersonFee;
  const extra = b?.fee?.extraPersons ?? Math.max(0, size - (b?.capacity ?? size));
  const holdMinutes = r?.holdPeriodMinutes ?? r?.parameters?.holdPeriodMinutes ?? 15;

  const setSize = async (partySize: number) => {
    const updated = await action.run(() => api.put<Booking>(`/api/bookings/${id}/party-size`, { partySize }));
    if (updated) booking.setData(updated);
  };
  const defaulted = useRef(false);
  useEffect(() => {
    if (!b || b.status !== 'Held' || b.partySize != null || defaulted.current) return;
    defaulted.current = true;
    void setSize(b.capacity ?? 1);
  }, [b]);   // eslint-disable-line react-hooks/exhaustive-deps
  const cancel = async () => {
    const cancelled = await action.run(() => api.post<Booking>(`/api/bookings/${id}/cancel`));
    if (cancelled) navigate(`/rounds/${cancelled.roundId ?? ''}`);
  };

  return (
    <Screen title={(b?.status && TITLE[b.status]) ?? 'Your booking'} back={b?.roundId ? `/rounds/${b.roundId}` : '/'} right={held ? <span data-testid="countdown">{mmss(remaining ?? 0)}</span> : undefined}>
      <ErrorAlert error={booking.error} />
      <ErrorAlert error={round.error} />
      <ErrorAlert error={action.error} onClose={action.clear} />
      {b && (
        <>
          {b.status === 'Held' && !held && (
            <div className="notice">Your hold has ended and the table was released (UC-01 EF-1). <Link to={`/rounds/${b.roundId ?? ''}`}>Choose a table again</Link>.</div>
          )}
          {b.status === 'Expired' && (
            <div className="notice">Your hold expired before payment and the table returned to the map (UC-01 EF-1). <Link to={`/rounds/${b.roundId ?? ''}`}>Choose a table again</Link>.</div>
          )}
          {b.status !== 'Held' && b.status !== 'Expired' && <div className="notice">This booking is <Badge fill>{b.status}</Badge>.</div>}

          <div className="card" data-testid="summary">
            <div className="b">{roundTitle(r)}{r?.artist ? ` · ${r.artist}` : ''}</div>
            <div>Table <b>{tableLabel(b.zoneId, b.tableNumber)}</b> · {zoneLabel(b.zoneId, b.zoneName)} · {typeLabel(table ?? b)}</div>
            <div className="muted">Package: {table?.packageContent ? `${table.packageContent} · ` : ''}{thb(b.fee?.packagePrice ?? table?.packagePrice)}</div>
          </div>

          <div className="label">Party size</div>
          <div className="row" style={{ marginTop: 4 }}>
            <span className="stepper">
              <button type="button" onClick={() => setSize(size - 1)} disabled={!held || action.busy || size <= 1} aria-label="fewer">−</button>
              <span className="v" data-testid="party-size">{size}</span>
              <button type="button" onClick={() => setSize(size + 1)} disabled={!held || action.busy} aria-label="more">+</button>
            </span>
            <span className="tiny right-text">
              <div>Capacity {b.capacity ?? '–'}</div>
              <div>{extra > 0 ? `${extraPersons(extra)} × ${thb(extraFee)}` : 'no extra person'}</div>
            </span>
          </div>
          <div className="hr" />
          <div data-testid="fee">
            <div className="row"><span>Package price</span><span>{thb(b.fee?.packagePrice ?? table?.packagePrice)}</span></div>
            <div className="row" data-testid="fee-extra"><span>Extra-person fee</span><span>{b.fee ? thb((b.fee.extraPersons ?? 0) * (b.fee.extraPersonFee ?? 0)) : '–'}</span></div>
            <div className="row b" style={{ fontSize: 16, marginTop: 4 }}><span>Full table fee</span><span data-testid="fee-total">{thb(b.fee?.fullTableFee)}</span></div>
            <div className="tiny">{b.fee ? 'Paid in full now; nothing to pay at the venue.' : 'Set the party size to see the full table fee.'}</div>
          </div>

          <button type="button" className="btn primary" onClick={() => navigate(`/bookings/${id}/profile`)} disabled={!held || !b.fee || action.busy}>Continue</button>
          <button type="button" className="btn secondary" onClick={cancel} disabled={b.status !== 'Held' || action.busy}>Cancel hold</button>
          <div className="tiny" style={{ marginTop: 8 }}>
            The table is held for you for {holdMinutes} minutes{held ? ` (until ${fmtClock(b.holdEndsAt)})` : ''}. If the hold expires before payment, it returns to the map.
          </div>
        </>
      )}
    </Screen>
  );
}
