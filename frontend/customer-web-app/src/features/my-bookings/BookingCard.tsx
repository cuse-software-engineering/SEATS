import { Link } from 'react-router-dom';
import { Badge, type Booking, Card, type Round, tableLabel, useCountdown, useGet, useSession } from '@seats/frontend-shared';
import { paths } from '../../app/paths';
import { fmtClock, roundTitle, zoneLabel } from '../../app/format';
import { bookingDetail } from './bookingDetail';

/** One booking: its round and status badge, the table, a detail line by status; a Confirmed booking opens its
 *  e-ticket, a Held one goes on to its summary and payment. The round is read once per round id and shared. */
export function BookingCard({ booking: b }: { booking: Booking }) {
  const session = useSession();
  const round = useGet<Round>(['round', b.roundId ?? ''], b.roundId ? `/api/rounds/${b.roundId}` : null);
  const r = round.data;
  const remaining = useCountdown(b.status === 'Held' ? b.holdEndsAt : null);
  const live = b.status === 'Held';
  const done = b.status === 'Confirmed' || b.status === 'Checked-in';
  const w = r?.checkInWindow;
  return (
    <Card data-testid="booking" data-booking={b.id} data-round={b.roundId}>
      <div className="row">
        <span className="b">{roundTitle(r)}</span>
        <Badge fill={done} hatch={live} dim={!done && !live}>{b.status}</Badge>
      </div>
      <div>{r?.artist ?? r?.name ?? (round.isPending ? '…' : 'Round')} · Table <b>{tableLabel(b.zoneId, b.tableNumber)}</b> · {zoneLabel(b.zoneId, b.zoneName)}</div>
      <div className="muted">{bookingDetail(b, r, session?.userId, remaining)}</div>
      {done && w && <div className="tiny">Check-in from {fmtClock(w.opensAt)}</div>}
      {done && <Link className="btn primary block sm" to={paths.confirmation(b.id ?? '')}>Show e-ticket</Link>}
      {live && <Link className="btn block sm" to={paths.booking(b.id ?? '')}>Continue to payment</Link>}
    </Card>
  );
}
