import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Badge, type Booking, ErrorAlert, mmss, tableLabel, useLoad, useSession } from '@seats/frontend-shared';
import { Screen } from '../Screen';
import { fmtClock, fmtDayMonth, roundTitle, typeLabel, zoneLabel } from '../format';
import { type RoundInfo, useRounds } from '../hooks';

const newestFirst = (a: Booking, b: Booking) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '');

/** The muted detail line of a booking, by status. */
function detail(b: Booking, info: RoundInfo | undefined, me: string | undefined, now: number): string {
  const type = typeLabel(info?.tables.find((t) => t.tableNumber === b.tableNumber) ?? b);
  const party = b.partySize !== undefined ? ` · party size ${b.partySize}` : '';
  switch (b.status) {
    case 'Held': {
      const left = b.holdEndsAt ? Math.round((new Date(b.holdEndsAt).getTime() - now) / 1000) : b.remainingHoldSeconds ?? 0;
      return left > 0 ? `Hold ends in ${mmss(left)} · pay to confirm` : 'Hold ending…';
    }
    case 'Confirmed': return `${type}${party} · paid in full`;
    case 'Checked-in': return `${type}${party} · checked in`;
    case 'Cancelled': {
      const at = b.history?.find((h) => h.status === 'Cancelled');
      return `Cancelled ${at?.by && at.by === me ? 'by you' : 'by the venue'}${at?.at ? ` on ${fmtDayMonth(at.at)}` : ''} · nothing charged`;
    }
    case 'Expired': return 'Hold expired before payment · nothing charged';
    case 'No-show': return `${type}${party} · no-show, the fee is not refunded`;
    default: return type;
  }
}

/** C9 My Bookings (UC-06): the customer's bookings, newest first, with their status; a Confirmed booking opens its
 *  e-ticket (C8), a Held one goes on to its summary and payment (C4). */
export default function C9MyBookings() {
  const session = useSession();
  const bookings = useLoad(() => api.get<Booking[]>('/api/customers/me/bookings'), []);
  const rounds = useRounds((bookings.data ?? []).map((b) => b.roundId ?? '').filter(Boolean));
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  return (
    <Screen title="My bookings" back="/">
      <ErrorAlert error={bookings.error} />
      <ErrorAlert error={rounds.error} />
      {bookings.loading && !bookings.data && <p className="muted">Loading…</p>}
      {bookings.data && bookings.data.length === 0 && <p className="muted">No booking yet. <Link to="/">Choose a concert round</Link>.</p>}
      {bookings.data && [...bookings.data].sort(newestFirst).map((b) => {
        const info = rounds.data?.get(b.roundId ?? '');
        const r = info?.round;
        const w = r?.checkInWindow;
        const live = b.status === 'Held';
        const done = b.status === 'Confirmed' || b.status === 'Checked-in';
        return (
          <div className="card" key={b.id} data-testid="booking" data-booking={b.id} data-round={b.roundId}>
            <div className="row">
              <span className="b">{roundTitle(r)}</span>
              <Badge fill={done} hatch={live} dim={!done && !live}>{b.status}</Badge>
            </div>
            <div>{r?.artist ?? r?.name ?? b.roundId} · Table <b>{tableLabel(b.zoneId, b.tableNumber)}</b> · {zoneLabel(b.zoneId, b.zoneName)}</div>
            <div className="muted">{detail(b, info, session?.userId, now)}</div>
            {done && w && <div className="tiny">Check-in from {fmtClock(w.opensAt)}</div>}
            {done && <Link className="btn primary small" to={`/bookings/${b.id}/confirmation`}>Show e-ticket</Link>}
            {live && <Link className="btn secondary small" to={`/bookings/${b.id}`}>Continue to payment</Link>}
          </div>
        );
      })}
      <div className="tiny" style={{ marginTop: 6 }}>Bookings are listed newest first.</div>
    </Screen>
  );
}
