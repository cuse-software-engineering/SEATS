import { EmptyState, LoadError, Loading, type UpcomingRound, useGet } from '@seats/frontend-shared';
import { Screen } from '../../app/Screen';
import { RoundCard } from './RoundCard';
import { byDate } from './roundStatus';

/** The upcoming Published rounds, one card each, by date (UC-01 steps 3–4, AF-1, AF-2). Read again every half
 *  minute, so a round that opens or sells out while the customer looks changes its badge. */
export function RoundListScreen() {
  const rounds = useGet<UpcomingRound[]>(['rounds'], '/api/rounds', { refetchInterval: 30_000 });
  const now = Date.now();
  return (
    <Screen title="Concert rounds">
      {rounds.isPending && <Loading what="Loading the concert rounds" />}
      {rounds.isError && <LoadError error={rounds.error} retry={() => void rounds.refetch()} what="load the concert rounds" />}
      {rounds.data && rounds.data.length === 0 && (
        <EmptyState title="No upcoming round yet" hint="The venue announces its concert rounds here; check back soon." />
      )}
      {rounds.data && [...rounds.data].sort(byDate).map((r) => <RoundCard key={r.id} round={r} now={now} />)}
      <div className="tiny" style={{ marginTop: 8 }}>Rounds are listed by date. Prices and the zone map are shown after you select a round.</div>
    </Screen>
  );
}
