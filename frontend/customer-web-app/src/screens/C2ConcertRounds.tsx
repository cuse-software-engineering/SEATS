import { Link } from 'react-router-dom';
import { api, Badge, ErrorAlert, useLoad, type UpcomingRound } from '@seats/frontend-shared';
import { Screen } from '../Screen';
import { fmtDayClock, roundTitle } from '../format';

type Kind = 'open' | 'not yet open' | 'sold out';

/** Open, not yet open (the booking-open time is ahead), or sold out (no table left of those for sale). */
function kindOf(r: UpcomingRound, now: number): Kind {
  const opensAt = r.bookingOpenAt ? new Date(r.bookingOpenAt).getTime() : NaN;
  if (r.status === 'not yet open' || (Number.isFinite(opensAt) && opensAt > now)) return 'not yet open';
  if (r.status === 'sold out' || (r.availableTables === 0 && (r.tablesForSale ?? 0) > 0)) return 'sold out';
  return 'open';
}

/** "Opens in 9 days" */
function opensIn(bookingOpenAt: string | undefined, now: number): string {
  const ms = bookingOpenAt ? new Date(bookingOpenAt).getTime() - now : NaN;
  if (!Number.isFinite(ms) || ms <= 0) return 'Opens soon';
  const hours = Math.ceil(ms / 3600e3);
  if (hours < 24) return `Opens in ${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.ceil(ms / 864e5);
  return `Opens in ${days} day${days === 1 ? '' : 's'}`;
}

const byDate = (a: UpcomingRound, b: UpcomingRound) => `${a.date ?? ''}${a.startAt ?? ''}`.localeCompare(`${b.date ?? ''}${b.startAt ?? ''}`);

/** C2 Concert rounds (UC-01 steps 3–4, AF-1, AF-2): one card per upcoming Published round, by date, with the artist,
 *  the booking-open time and the status; Select this round opens the map (C3). */
export default function C2ConcertRounds() {
  const rounds = useLoad(() => api.get<UpcomingRound[]>('/api/rounds'), []);
  const now = Date.now();
  return (
    <Screen title="Concert rounds">
      <ErrorAlert error={rounds.error} />
      {rounds.loading && !rounds.data && <p className="muted">Loading…</p>}
      {rounds.data && rounds.data.length === 0 && <p className="muted">No upcoming round yet.</p>}
      {rounds.data && [...rounds.data].sort(byDate).map((r) => {
        const kind = kindOf(r, now);
        return (
          <div className="card" key={r.id} data-testid="round" data-round={r.id}>
            <div className="row">
              <span className="b">{roundTitle(r)}</span>
              {kind === 'open' && <Badge>Open</Badge>}
              {kind === 'not yet open' && <Badge hatch>Not yet open</Badge>}
              {kind === 'sold out' && <Badge fill>Sold out</Badge>}
            </div>
            <div>{r.artist ?? r.name}</div>
            <div className="muted">
              {kind === 'sold out' ? 'All tables booked' : kind === 'open' ? `Booking opened ${fmtDayClock(r.bookingOpenAt)}` : `Booking opens ${fmtDayClock(r.bookingOpenAt)}`}
            </div>
            {kind === 'open' && <Link className="btn primary small" to={`/rounds/${r.id}`}>Select this round</Link>}
            {kind === 'not yet open' && <button type="button" className="btn small" disabled>{opensIn(r.bookingOpenAt, now)}</button>}
            {kind === 'sold out' && <button type="button" className="btn small" disabled>Sold out</button>}
          </div>
        );
      })}
      <div className="tiny" style={{ marginTop: 8 }}>Rounds are listed by date. Prices and the zone map are shown after you select a round.</div>
    </Screen>
  );
}
