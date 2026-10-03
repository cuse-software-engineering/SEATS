import { Link, useParams } from 'react-router-dom';
import { api, type ApiError, type Booking, type ETicket, ErrorAlert, tableLabel, toApiError, useLoad } from '@seats/frontend-shared';
import { Screen } from '../Screen';
import { extraPersons, fmtClock, roundTitle, thb, typeLabel, zoneLabel } from '../format';
import { useRoundOf } from '../hooks';

type Ticket = { ticket: ETicket } | { notBuilt: ApiError };

/** "SEATS-260926-A12-····": the shape of a booking reference while the e-ticket route is a stub (progress 1). */
const placeholderReference = (date: string | undefined, label: string): string => `SEATS-${(date ?? '').replace(/-/g, '').slice(2, 8) || '······'}-${label || '··'}-····`;

/** C8 Confirmation and e-ticket (UC-01 steps 16–20, EF-3): the result box, the e-ticket card with the QR, the
 *  booking reference and the booking details, the note about the LINE copy, My bookings. */
export default function C8ConfirmationAndETicket() {
  const { id = '' } = useParams();
  const booking = useLoad(() => api.get<Booking>(`/api/bookings/${id}`), [id]);
  const ticket = useLoad<Ticket>(async () => {
    try { return { ticket: await api.get<ETicket>(`/api/bookings/${id}/e-ticket`) }; }
    catch (e) { const err = toApiError(e); if (err.status === 501) return { notBuilt: err }; throw e; }
  }, [id]);
  const { round, table } = useRoundOf(booking.data);
  const b = booking.data;
  const r = round.data;
  const w = r?.checkInWindow;
  const confirmed = b?.status === 'Confirmed' || b?.status === 'Checked-in';
  const label = tableLabel(b?.zoneId, b?.tableNumber);
  const extra = b?.fee?.extraPersons ?? 0;

  return (
    <Screen title="Confirmation" padTop={8}>
      <ErrorAlert error={booking.error} />
      <ErrorAlert error={ticket.error} />
      <ErrorAlert error={round.error} />
      {b && (
        <div className="result" data-testid="result">
          {confirmed ? (
            <><div className="big">✓ Booking confirmed</div><div className="muted">Paid in full · {thb(b.fee?.fullTableFee)}</div></>
          ) : (
            <><div className="big">Booking {b.status?.toLowerCase() ?? ''}</div><div className="muted">Not paid yet · the confirmation comes with the payment in progress 2</div></>
          )}
        </div>
      )}
      <div className="card center">
        <div className="tiny">E-TICKET</div>
        <div className="qr" role="img" aria-label="e-ticket QR" />
        <div className="mono" style={{ fontSize: 13 }} data-testid="booking-reference">
          {ticket.data && 'ticket' in ticket.data ? ticket.data.ticket.bookingReference : placeholderReference(r?.date, label)}
        </div>
        {ticket.data && 'notBuilt' in ticket.data && (
          <div className="notice" style={{ textAlign: 'left' }} data-testid="eticket-notice">
            <strong>The e-ticket comes with progress 2.</strong> The gateway answered {ticket.data.notBuilt.status}: {ticket.data.notBuilt.error}.
          </div>
        )}
        <div className="hr" />
        {b && (
          <div className="kv">
            <span className="k">Round</span><span>{roundTitle(r)}</span>
            <span className="k">Table</span><span>{label} · {zoneLabel(b.zoneId, b.zoneName)} · {typeLabel(table ?? b)}</span>
            <span className="k">Party size</span><span>{b.partySize ?? '–'}{extra > 0 ? ` (${extraPersons(extra)} paid)` : ''}</span>
            <span className="k">Check-in</span><span>{w ? `from ${fmtClock(w.opensAt)} · table kept until ${fmtClock(w.graceEndsAt)}` : '–'}</span>
          </div>
        )}
      </div>
      <div className="tiny">A copy with the booking terms was sent to your LINE chat.</div>
      <Link className="btn secondary small" to="/my-bookings">My bookings</Link>
    </Screen>
  );
}
