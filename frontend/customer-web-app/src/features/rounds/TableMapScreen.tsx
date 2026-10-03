import { useNavigate, useParams } from 'react-router-dom';
import {
  api, ApiError, type Booking, describeError, LoadError, Loading, type Round, type RoundTable, type RoundTableStatus, StatusLegend, statusMap,
  TableGrid, tableLabel, toApiError, useGet, useMutate, usePolled,
} from '@seats/frontend-shared';
import { paths } from '../../app/paths';
import { roundTitle } from '../../app/format';
import { Screen } from '../../app/Screen';
import { PriceLines } from './PriceLines';

/** The tables of the round with their live status, polled every 2 s (ADR-09); a tap on an available table holds it
 *  and opens the hold summary (UC-01 steps 5–8). A hold refused because the table was just taken (AF-3) says so in a
 *  toast while the map refreshes itself; any other refusal is a toast too. */
export function TableMapScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const round = useGet<Round>(['round', id], `/api/rounds/${id}`);
  const live = usePolled<RoundTableStatus>(`/api/rounds/${id}/table-status`, 2000);
  const r = round.data;
  const holdMinutes = r?.holdPeriodMinutes ?? r?.parameters?.holdPeriodMinutes ?? 15;

  const hold = useMutate<RoundTable, Booking>(async (t) => {
    const label = tableLabel(t.zoneId, t.tableNumber);
    try {
      return await api.post<Booking>('/api/bookings', { roundId: id, tableNumber: t.tableNumber });
    } catch (e) {
      const err = toApiError(e);
      if (err.status === 409) throw new ApiError(409, `Table ${label} was just taken by another customer. The map has been refreshed.`, err.details);
      throw new ApiError(err.status, `Could not hold table ${label}: ${describeError(err)}`, err.details);
    }
  }, {
    success: (b) => `Table ${tableLabel(b.zoneId, b.tableNumber)} is held for you for ${holdMinutes} minutes`,
    invalidate: [['my-bookings'], ['rounds']],
    onSuccess: (b) => { if (b.id) navigate(paths.booking(b.id)); },
  });

  return (
    <Screen title={r ? `${roundTitle(r, false)} · ${r.artist ?? r.name ?? ''}` : 'Table map'} pageTitle="Table map" back={paths.rounds} padTop={8}>
      <div className="row">
        <span className="muted">Zone map · refreshed live</span>
        <span className="tiny">{hold.isPending ? 'Holding the table…' : 'Tap an available table'}</span>
      </div>
      {round.isError && <LoadError error={round.error} retry={() => void round.refetch()} what="load the round" />}
      {!round.isError && live.error && !live.data && <LoadError error={live.error} what="read which tables are free" />}
      {!round.isError && (round.isPending || (!live.data && !live.error)) && <Loading what="Loading the table map" />}
      {r?.tables && live.data && (
        <div data-testid="table-map">
          <TableGrid tables={r.tables} status={statusMap(live.data)} onPick={(t) => hold.mutate(t)} busy={hold.isPending} size={0.88} />
        </div>
      )}
      {live.data && live.error && <div className="tiny">The live status could not be refreshed ({describeError(live.error)}); trying again.</div>}
      <StatusLegend labels={{ AVAILABLE: 'Available', HELD: `Held (${holdMinutes} min)`, BOOKED: 'Booked' }} />
      {r?.tables && <PriceLines tables={r.tables} extraFee={r.parameters?.extraPersonFee} />}
    </Screen>
  );
}
