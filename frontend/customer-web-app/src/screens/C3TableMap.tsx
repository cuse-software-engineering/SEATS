import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  api, type ApiError, type Booking, countByStatus, ErrorAlert, fmtDate, fmtDateTime, poll, type Round, type RoundTable,
  type RoundTableStatus, statusMap, TableGrid, useAction, useLoad,
} from '@seats/frontend-shared';

/** C3 Table map (UC-01 steps 5–8, AF-3): the tables of the round with their live status, polled every 2 s (ADR-09);
 *  a tap on an available table holds it (POST /api/bookings) and opens C4. */
export default function C3TableMap() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const round = useLoad(() => api.get<Round>(`/api/rounds/${id}`), [id]);
  const tables = useLoad(() => api.get<RoundTable[]>(`/api/rounds/${id}/tables`), [id]);
  const [status, setStatus] = useState<RoundTableStatus | null>(null);
  const [pollError, setPollError] = useState<ApiError | null>(null);
  const hold = useAction();

  useEffect(() => poll<RoundTableStatus>(`/api/rounds/${id}/table-status`, 2000, (s) => { setStatus(s); setPollError(null); }, setPollError), [id]);

  const pick = async (t: RoundTable) => {
    const booking = await hold.run(() => api.post<Booking>('/api/bookings', { roundId: id, tableNumber: t.tableNumber }));
    if (booking?.id) navigate(`/bookings/${booking.id}`);
  };

  const counts = countByStatus(status);
  return (
    <>
      <h1>{round.data?.name ?? 'Table map'}</h1>
      {round.data && (
        <p className="muted">
          {round.data.artist} · {fmtDate(round.data.date)} · doors {fmtDateTime(round.data.doorsOpenAt)} · start {fmtDateTime(round.data.startAt)}
          {round.data.holdPeriodMinutes !== undefined && <> · a held table is yours for {round.data.holdPeriodMinutes} minutes</>}
        </p>
      )}
      <ErrorAlert error={round.error} />
      <ErrorAlert error={tables.error} />
      <ErrorAlert error={pollError} />
      <ErrorAlert error={hold.error} onClose={hold.clear} />
      <div className="card" data-testid="table-map">
        <div className="counts" data-testid="counts">
          <div><strong>{counts.AVAILABLE}</strong>available</div>
          <div><strong>{counts.HELD}</strong>held</div>
          <div><strong>{counts.BOOKED}</strong>booked</div>
          <div><strong>{counts.OCCUPIED}</strong>occupied</div>
          <div><strong>{status?.version ?? '–'}</strong>map version</div>
        </div>
        <p className="small muted">Tap an available table to hold it{hold.busy ? '…' : '.'}</p>
        {tables.data && <TableGrid tables={tables.data} status={statusMap(status)} onPick={pick} busy={hold.busy} />}
      </div>
    </>
  );
}
