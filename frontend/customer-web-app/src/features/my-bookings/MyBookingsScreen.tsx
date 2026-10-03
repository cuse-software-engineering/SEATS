import { Link } from 'react-router-dom';
import { type Booking, EmptyState, LoadError, Loading, useGet } from '@seats/frontend-shared';
import { paths } from '../../app/paths';
import { Screen } from '../../app/Screen';
import { BookingCard } from './BookingCard';

const newestFirst = (a: Booking, b: Booking) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '');

/** The customer's bookings, newest first, with their status (UC-06). Read again every 15 s so an expiring hold
 *  changes its badge. */
export function MyBookingsScreen() {
  const bookings = useGet<Booking[]>(['my-bookings'], '/api/customers/me/bookings', { refetchInterval: 15_000 });
  return (
    <Screen title="My bookings" back={paths.rounds}>
      {bookings.isPending && <Loading what="Loading your bookings" />}
      {bookings.isError && <LoadError error={bookings.error} retry={() => void bookings.refetch()} what="load your bookings" />}
      {bookings.data && bookings.data.length === 0 && (
        <EmptyState title="No booking yet" hint="Choose a concert round and tap a free table to hold it." action={<Link className="btn primary" to={paths.rounds}>Choose a concert round</Link>} />
      )}
      {bookings.data && [...bookings.data].sort(newestFirst).map((b) => <BookingCard key={b.id} booking={b} />)}
      {bookings.data && bookings.data.length > 0 && <div className="tiny" style={{ marginTop: 6 }}>Bookings are listed newest first.</div>}
    </Screen>
  );
}
