import { countByStatus, type RoundTable, type RoundTableStatus, statusMap, StatusLegend, TableGrid } from '@seats/frontend-shared';
import { plural } from '../../app/format';

/** The table map of a round with the status of every table, the legend and the counts. */
export function LiveView({ tables, status }: { tables: RoundTable[]; status: RoundTableStatus | null }) {
  const counts = countByStatus(status);
  const total = status?.tables?.length ?? tables.length;
  return (
    <div className="live-map">
      <TableGrid tables={tables} status={statusMap(status)} />
      <StatusLegend statuses={['AVAILABLE', 'HELD', 'BOOKED', 'OCCUPIED']} labels={{ AVAILABLE: 'Available', HELD: 'Held', BOOKED: 'Booked', OCCUPIED: 'Occupied (checked in)' }} />
      <div className="counts" data-testid="counts">
        <span>Available <b>{counts.AVAILABLE}</b></span>
        <span>Held <b>{counts.HELD}</b></span>
        <span>Booked <b>{counts.BOOKED}</b></span>
        <span>Occupied <b>{counts.OCCUPIED}</b></span>
        <span className="plain">of {plural(total, 'table')}{counts.NOT_FOR_SALE ? ` · ${counts.NOT_FOR_SALE} not for sale` : ''}</span>
      </div>
    </div>
  );
}
