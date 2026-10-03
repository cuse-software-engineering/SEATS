import { Link } from 'react-router-dom';
import { Badge, type Booking } from '@seats/frontend-shared';
import { paths } from '../../app/paths';

/** What happened to a booking that is no longer a live hold, and where to go from here. Nothing while the hold runs. */
export function HoldStateNotice({ booking: b, held }: { booking: Booking; held: boolean }) {
  const map = paths.round(b.roundId ?? '');
  if (b.status === 'Held') {
    if (held) return null;
    return <div className="notice">Your hold has ended and the table was released. <Link to={map}>Choose a table again</Link>.</div>;
  }
  if (b.status === 'Expired') {
    return <div className="notice">Your hold expired before payment and the table returned to the map. <Link to={map}>Choose a table again</Link>.</div>;
  }
  if (b.status === 'Cancelled') {
    return <div className="notice">This booking was cancelled and the table is available again. <Link to={map}>Back to the map</Link> · <Link to={paths.myBookings}>My bookings</Link></div>;
  }
  return (
    <div className="notice">
      This booking is <Badge fill>{b.status}</Badge>. {b.status === 'Confirmed' || b.status === 'Checked-in' ? <Link to={paths.confirmation(b.id ?? '')}>Show the e-ticket</Link> : <Link to={paths.myBookings}>My bookings</Link>}
    </div>
  );
}
