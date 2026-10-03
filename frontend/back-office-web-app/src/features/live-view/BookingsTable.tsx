import { type Booking, DataTable, fmtClock, tableLabel } from '@seats/frontend-shared';

const checkIn = (b: Booking) => b.history?.find((h) => h.status === 'Checked-in');

/** "Bookings of the round": table, name (the customer id for now), party, status, checked in (time and staff). */
export function BookingsTable({ bookings }: { bookings: Booking[] }) {
  return (
    <DataTable<Booking> testId="bookings" rows={bookings} rowKey={(b) => b.id ?? ''} empty="No booking yet."
      columns={[
        { key: 'table', header: 'Table', width: '52px', cell: (b) => tableLabel(b.zoneId, b.tableNumber) },
        { key: 'name', header: 'Name', cell: (b) => <>{b.customerId}{b.status === 'Held' && <span className="tiny"> (paying)</span>}</> },
        { key: 'party', header: 'Party', align: 'right', width: '48px', cell: (b) => b.partySize ?? '–' },
        { key: 'status', header: 'Status', width: '82px', cell: (b) => b.status },
        { key: 'checkin', header: 'Checked in', width: '96px', cell: (b) => { const c = checkIn(b); return c ? `${fmtClock(c.at)}${c.by ? ` ${c.by}` : ''}` : '–'; } },
      ]} />
  );
}
