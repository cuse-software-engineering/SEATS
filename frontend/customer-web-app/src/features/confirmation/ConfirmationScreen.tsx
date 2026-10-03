import { Link, useParams } from 'react-router-dom';
import { type Booking, type ETicket, LoadError, Loading, useGet } from '@seats/frontend-shared';
import { paths } from '../../app/paths';
import { thb } from '../../app/format';
import { Screen } from '../../app/Screen';
import { useRoundOfBooking } from '../booking/useBooking';
import { ETicketCard } from './ETicketCard';

/** The confirmation (UC-01 steps 16–20, EF-3): the result box, the e-ticket card with the QR, the booking reference
 *  and the booking details, the note about the LINE copy, My bookings. Opened from the payment as a preview while
 *  the e-ticket is not issued yet: the box then says the booking is not paid. */
export function ConfirmationScreen() {
  const { id = '' } = useParams();
  const booking = useGet<Booking>(['booking', id], `/api/bookings/${id}`);
  const ticket = useGet<ETicket>(['e-ticket', id], `/api/bookings/${id}/e-ticket`, { retry: false });
  const ticketUnavailable = ticket.isError && ticket.error.status === 501;
  const { round, table } = useRoundOfBooking(booking.data);
  const b = booking.data;
  const confirmed = b?.status === 'Confirmed' || b?.status === 'Checked-in';

  return (
    <Screen title="Confirmation" padTop={8}>
      {booking.isPending && <Loading what="Loading your booking" />}
      {booking.isError && <LoadError error={booking.error} retry={() => void booking.refetch()} what="load your booking" />}
      {ticket.isError && !ticketUnavailable && <LoadError error={ticket.error} retry={() => void ticket.refetch()} what="load the e-ticket" />}
      {round.isError && <LoadError error={round.error} retry={() => void round.refetch()} what="load the round" />}
      {b && (
        <div className={`result ${confirmed ? 'ok' : ''}`.trim()} data-testid="result">
          {confirmed ? (
            <><div className="big">✓ Booking confirmed</div><div className="muted">Paid in full · {thb(b.fee?.fullTableFee)}</div></>
          ) : (
            <><div className="big">Booking {b.status?.toLowerCase() ?? ''}</div><div className="muted">Not paid yet · the confirmation appears here once the payment is received</div></>
          )}
        </div>
      )}
      <ETicketCard booking={b} round={round.data} table={table} ticket={ticket.data} unavailable={ticketUnavailable} />
      <div className="tiny">{confirmed ? 'A copy with the booking terms was sent to your LINE chat.' : 'A copy with the booking terms is sent to your LINE chat once the booking is confirmed.'}</div>
      <Link className="btn block sm" to={paths.myBookings}>My bookings</Link>
    </Screen>
  );
}
