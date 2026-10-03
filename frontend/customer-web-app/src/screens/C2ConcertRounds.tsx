import { Link } from 'react-router-dom';
import { api, Badge, ErrorAlert, fmtDate, fmtDateTime, useLoad, type UpcomingRound } from '@seats/frontend-shared';

/** C2 Concert rounds (UC-01 steps 3–4, AF-1, AF-2): the upcoming Published rounds with their booking status. */
export default function C2ConcertRounds() {
  const rounds = useLoad(() => api.get<UpcomingRound[]>('/api/rounds'), []);
  return (
    <>
      <h1>Concert rounds</h1>
      <ErrorAlert error={rounds.error} />
      <div className="card">
        {rounds.loading && !rounds.data && <p className="muted">Loading…</p>}
        {rounds.data && rounds.data.length === 0 && (
          <p className="muted">No upcoming round. Publish one in the back-office (B3) or run <code>npm run smoke</code>.</p>
        )}
        {rounds.data && rounds.data.length > 0 && (
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr><th>Round</th><th>Artist</th><th>Date</th><th>Start</th><th>Booking opens</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {rounds.data.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.name}</strong></td>
                    <td>{r.artist}</td>
                    <td>{fmtDate(r.date)}</td>
                    <td>{fmtDateTime(r.startAt)}</td>
                    <td>{fmtDateTime(r.bookingOpenAt)}</td>
                    <td>
                      {r.status === 'open' && <span className="badge open">open · {r.availableTables}/{r.tablesForSale} tables</span>}
                      {r.status === 'not yet open' && <Badge>not yet open</Badge>}
                      {r.status === 'sold out' && <Badge soft>sold out</Badge>}
                    </td>
                    <td className="actions">
                      {r.status === 'open' && <Link className="btn" to={`/rounds/${r.id}`}>Choose a table</Link>}
                      {r.status === 'not yet open' && <span className="small muted">opens {fmtDateTime(r.bookingOpenAt)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="row"><button type="button" className="secondary" onClick={rounds.reload}>Refresh</button></div>
      </div>
    </>
  );
}
