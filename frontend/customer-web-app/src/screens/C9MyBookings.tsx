import { Link } from 'react-router-dom';
import { api, Badge, type Booking, ErrorAlert, fmtDateTime, fmtTHB, useLoad } from '@seats/frontend-shared';

/** C9 My Bookings (UC-06): the customer's bookings with status; a Confirmed booking opens its e-ticket (C8). */
export default function C9MyBookings() {
  const bookings = useLoad(() => api.get<Booking[]>('/api/customers/me/bookings'), []);
  return (
    <>
      <h1>My Bookings</h1>
      <ErrorAlert error={bookings.error} />
      <div className="card">
        {bookings.data && bookings.data.length === 0 && <p className="muted">No booking yet. <Link to="/">Choose a concert round</Link>.</p>}
        {bookings.data && bookings.data.length > 0 && (
          <div className="table-scroll">{/* the wide table scrolls inside the card on a phone, as C2 does */}
          <table className="data">
            <thead><tr><th>Booking</th><th>Round</th><th>Table</th><th>Party</th><th>Fee</th><th>Status</th><th>Made</th><th></th></tr></thead>
            <tbody>
              {bookings.data.map((b) => (
                <tr key={b.id}>
                  <td><code>{b.id}</code></td>
                  <td><code>{b.roundId}</code></td>
                  <td>#{b.tableNumber} · {b.zoneName ?? b.zoneId}</td>
                  <td>{b.partySize ?? '–'}</td>
                  <td>{fmtTHB(b.fee?.fullTableFee)}</td>
                  <td><Badge solid={b.status === 'Confirmed'}>{b.status}</Badge></td>
                  <td className="small">{fmtDateTime(b.createdAt)}</td>
                  <td>
                    {b.status === 'Held' && <Link className="btn" to={`/bookings/${b.id}`}>Continue</Link>}
                    {(b.status === 'Confirmed' || b.status === 'Checked-in') && <Link className="btn" to={`/bookings/${b.id}/confirmation`}>E-ticket</Link>}
                    {b.status !== 'Held' && b.status !== 'Confirmed' && b.status !== 'Checked-in' && <Link className="btn secondary" to={`/bookings/${b.id}/confirmation`}>View</Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
        <div className="row"><button type="button" className="secondary" onClick={bookings.reload}>Refresh</button></div>
      </div>
    </>
  );
}
