import { Link, useParams } from 'react-router-dom';
import { api, type ApiError, Badge, type Booking, type ETicket, ErrorAlert, fmtDate, fmtDateTime, fmtTHB, type Round, toApiError, useLoad } from '@seats/frontend-shared';

type Ticket = { ticket: ETicket } | { notBuilt: ApiError };

/** C8 Confirmation and e-ticket (UC-01 steps 16–20, EF-3): the Confirmed banner, the QR e-ticket with the booking
 *  reference, the booking details, the check-in window (from the round), the note about the LINE copy. */
export default function C8ConfirmationAndETicket() {
  const { id = '' } = useParams();
  const booking = useLoad(() => api.get<Booking>(`/api/bookings/${id}`), [id]);
  const ticket = useLoad<Ticket>(async () => {
    try { return { ticket: await api.get<ETicket>(`/api/bookings/${id}/e-ticket`) }; }
    catch (e) { const err = toApiError(e); if (err.status === 501) return { notBuilt: err }; throw e; }
  }, [id]);
  const roundId = booking.data?.roundId;
  const round = useLoad(() => (roundId ? api.get<Round>(`/api/rounds/${roundId}`) : Promise.resolve(null)), [roundId]);
  const b = booking.data;
  const w = round.data?.checkInWindow;

  return (
    <>
      {b?.status === 'Confirmed' ? <div className="banner">Booking confirmed</div> : b && <div className="banner">Booking {b.status} <span className="small muted">— the confirmation comes with the payment in progress 2</span></div>}
      <ErrorAlert error={booking.error} />
      <ErrorAlert error={ticket.error} />
      <ErrorAlert error={round.error} />
      <div className="card">
        <h4>E-ticket</h4>
        {ticket.data && 'ticket' in ticket.data && (
          <div className="row">
            <div className="qr">{ticket.data.ticket.qrPayload}</div>
            <div>Booking reference <strong>{ticket.data.ticket.bookingReference}</strong><br /><span className="small muted">Show this QR at the door; a copy was sent to your LINE chat.</span></div>
          </div>
        )}
        {ticket.data && 'notBuilt' in ticket.data && <div className="notice">The e-ticket comes in progress 2. The gateway answered {ticket.data.notBuilt.status}: {ticket.data.notBuilt.error}</div>}
      </div>
      {b && (
        <div className="card">
          <h4>Booking details</h4>
          <table className="data">
            <tbody>
              <tr><th>Booking</th><td><code>{b.id}</code> <Badge>{b.status}</Badge></td></tr>
              <tr><th>Round</th><td>{round.data ? `${round.data.name ?? ''} · ${round.data.artist ?? ''} · ${fmtDate(round.data.date)} · start ${fmtDateTime(round.data.startAt)}` : b.roundId}</td></tr>
              <tr><th>Table</th><td>#{b.tableNumber} · {b.zoneName ?? b.zoneId} · {b.capacity} seats</td></tr>
              <tr><th>Party size</th><td>{b.partySize ?? '–'}</td></tr>
              <tr><th>Full table fee</th><td>{fmtTHB(b.fee?.fullTableFee)}</td></tr>
              {w && <tr><th>Check-in window</th><td>{fmtDateTime(w.opensAt)} until {fmtDateTime(w.graceEndsAt)} (start {fmtDateTime(w.startAt)})</td></tr>}
            </tbody>
          </table>
          <p className="small muted">A copy of this confirmation is sent to your LINE chat (Notification Service).</p>
          <div className="row"><Link className="btn secondary" to="/my-bookings">My Bookings</Link></div>
        </div>
      )}
    </>
  );
}
