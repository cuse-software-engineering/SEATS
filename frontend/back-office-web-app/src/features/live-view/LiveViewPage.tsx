import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState, Field, LoadError, Loading, type RoundTableStatus, Select, usePolled, useSession } from '@seats/frontend-shared';
import { clockWithSeconds, plural, roundWhen } from '../../app/format';
import { keys, useRoundBookings, useRoundTables, useUpcomingRounds } from '../../app/queries';
import { queryClient } from '../../app/query-client';
import { usePageTitle } from '../../app/use-page-title';
import { BookingsTable } from './BookingsTable';
import { LiveView } from './LiveView';

/** The live view: the round at the top left and the refresh clock at the right; the table map polled every 2 s
 *  with the legend and the counts under it; the bookings of the round at the right (manager and owner). */
export default function LiveViewPage() {
  usePageTitle('Live view');
  const session = useSession();
  const canList = session?.role === 'manager' || session?.role === 'owner';
  const [params, setParams] = useSearchParams();
  const roundId = params.get('round') ?? '';
  const rounds = useUpcomingRounds();
  const tables = useRoundTables(roundId || null);
  const bookings = useRoundBookings(roundId || null, canList);
  const status = usePolled<RoundTableStatus>(roundId ? `/api/rounds/${roundId}/table-status` : null, 2000);
  const [changedAt, setChangedAt] = useState<Date | null>(null);

  // every change of the map (a new version) also re-reads the bookings
  useEffect(() => {
    if (!status.data) { setChangedAt(null); return; }
    setChangedAt(new Date());
    void queryClient.invalidateQueries({ queryKey: keys.roundBookings(roundId) });
  }, [status.data, roundId]);

  const confirmed = bookings.data?.filter((b) => b.status === 'Confirmed' || b.status === 'Checked-in').length ?? 0;
  const checkedIn = bookings.data?.filter((b) => b.status === 'Checked-in').length ?? 0;

  return (
    <div className="live">
      <div className="live-head">
        <Field label="Round" inline>
          {(id) => (
            <Select id={id} value={roundId} onChange={(e) => setParams(e.target.value ? { round: e.target.value } : {}, { replace: true })} style={{ width: 360, maxWidth: '100%' }}>
              <option value="">— choose a round —</option>
              {rounds.data?.map((r) => <option key={r.id} value={r.id}>{roundWhen(r)} · {r.artist || r.name}</option>)}
            </Select>
          )}
        </Field>
        <span className="tiny">Refreshes every 2 s{changedAt ? ` · last change ${clockWithSeconds(changedAt)}` : ''}{status.data?.version !== undefined ? ` · version ${status.data.version}` : ''}</span>
      </div>
      {rounds.isError && <LoadError error={rounds.error} retry={() => void rounds.refetch()} what="load the rounds" />}
      {!roundId && <EmptyState title="No round chosen" hint={rounds.data?.length === 0 ? 'There is no upcoming round to watch.' : 'Choose a round above to watch its tables.'} />}
      {roundId && (
        <div className="cols-2">
          <div className="live-left">
            {tables.isLoading && <Loading what="Loading the map" />}
            {tables.isError && <LoadError error={tables.error} retry={() => void tables.refetch()} what="load the map" />}
            {status.error && <LoadError error={status.error} what="read the table status" />}
            {tables.data && <LiveView tables={tables.data} status={status.data} />}
          </div>
          <div className="live-right">
            <h2 className="pt">Bookings of the round</h2>
            {!canList && <div className="tiny">The bookings of a round are listed for the Manager and the Owner.</div>}
            {canList && bookings.isLoading && <Loading what="Loading the bookings" />}
            {canList && bookings.isError && <LoadError error={bookings.error} retry={() => void bookings.refetch()} what="load the bookings" />}
            {bookings.data && <BookingsTable bookings={bookings.data} />}
            {bookings.data && bookings.data.length > 0 && <div className="tiny" style={{ marginTop: 6 }}>{plural(bookings.data.length, 'booking')}. Checked in {checkedIn} of {confirmed} confirmed.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
