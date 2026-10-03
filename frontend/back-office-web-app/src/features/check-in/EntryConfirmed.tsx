import { Link } from 'react-router-dom';
import { type Booking, fmtClock, LoadError, type RoundTableStatus, statusMap, TableGrid, tableLabel, useGet, useSession } from '@seats/frontend-shared';
import { useRoundTables } from '../../app/queries';

/** "Checked in" with the time, the staff and the party size; the zone's mini map with the table highlighted; Next scan. */
export function EntryConfirmed({ booking, at }: { booking: Booking; at: string }) {
  const session = useSession();
  const roundId = booking.roundId ?? '';
  const tables = useRoundTables(roundId || null);
  const status = useGet<RoundTableStatus>(['round', roundId, 'status-once'], roundId && `/api/rounds/${roundId}/table-status`);
  const label = tableLabel(booking.zoneId, booking.tableNumber);
  const zoneTables = (tables.data ?? []).filter((t) => t.zoneId === booking.zoneId);
  return (
    <>
      <div className="result ok">
        <div className="big">✓ Checked in</div>
        <div className="muted">{fmtClock(at)} · by {session?.label ?? session?.userId} · party size {booking.partySize ?? '–'}</div>
      </div>
      <div className="b" style={{ marginTop: 6 }}>Guide the party to table {label}</div>
      <div className="muted">{booking.zoneName ?? (booking.zoneId ? `Zone ${booking.zoneId}` : '')}</div>
      {tables.isError && <LoadError error={tables.error} what="load the map" />}
      {zoneTables.length > 0 && <div className="mini-map"><TableGrid tables={zoneTables} status={statusMap(status.data ?? null)} selected={booking.tableNumber} size={0.85} /></div>}
      <div className="tiny">The live view shows {label} as occupied now.</div>
      <Link className="btn primary block" to="/check-in">Next scan</Link>
    </>
  );
}
