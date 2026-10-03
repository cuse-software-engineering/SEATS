import { Link } from 'react-router-dom';
import { Badge, Button, Card, type UpcomingRound } from '@seats/frontend-shared';
import { paths } from '../../app/paths';
import { fmtDayClock, roundTitle } from '../../app/format';
import { kindOf, opensIn } from './roundStatus';

/** One upcoming round: its start, the artist, the booking-open time and the status badge; Select this round opens
 *  the table map, a round not yet open or sold out shows why instead. */
export function RoundCard({ round, now }: { round: UpcomingRound; now: number }) {
  const kind = kindOf(round, now);
  return (
    <Card data-testid="round" data-round={round.id}>
      <div className="row">
        <span className="b">{roundTitle(round)}</span>
        {kind === 'open' && <Badge>Open</Badge>}
        {kind === 'not yet open' && <Badge hatch>Not yet open</Badge>}
        {kind === 'sold out' && <Badge fill>Sold out</Badge>}
      </div>
      <div>{round.artist ?? round.name}</div>
      <div className="muted">
        {kind === 'sold out' ? 'All tables booked' : kind === 'open' ? `Booking opened ${fmtDayClock(round.bookingOpenAt)}` : `Booking opens ${fmtDayClock(round.bookingOpenAt)}`}
      </div>
      {kind === 'open' && <Link className="btn primary block sm" to={paths.round(round.id ?? '')}>Select this round</Link>}
      {kind === 'not yet open' && <Button block size="sm" disabled>{opensIn(round.bookingOpenAt, now)}</Button>}
      {kind === 'sold out' && <Button block size="sm" disabled>Sold out</Button>}
    </Card>
  );
}
