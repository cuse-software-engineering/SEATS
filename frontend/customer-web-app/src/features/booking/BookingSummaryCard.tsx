import { type Booking, Card, type Round, type RoundTable, tableLabel } from '@seats/frontend-shared';
import { roundTitle, thb, typeLabel, zoneLabel } from '../../app/format';

/** The booking in three lines: the round and its artist, the table with its zone and type, the package and price. */
export function BookingSummaryCard({ booking: b, round: r, table }: { booking: Booking; round: Round | undefined; table: RoundTable | undefined }) {
  return (
    <Card data-testid="summary">
      <div className="b">{roundTitle(r)}{r?.artist ? ` · ${r.artist}` : ''}</div>
      <div>Table <b>{tableLabel(b.zoneId, b.tableNumber)}</b> · {zoneLabel(b.zoneId, b.zoneName)} · {typeLabel(table ?? b)}</div>
      <div className="muted">Package: {table?.packageContent ? `${table.packageContent} · ` : ''}{thb(b.fee?.packagePrice ?? table?.packagePrice)}</div>
    </Card>
  );
}
