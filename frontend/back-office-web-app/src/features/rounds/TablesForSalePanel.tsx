import { Card, type ZoneMap } from '@seats/frontend-shared';
import { zoneTitle } from '../../app/format';

/** "Tables for sale and capacity per zone", from the chosen map and the tables marked not for sale. */
export function TablesForSalePanel({ zoneMap, tablesNotForSale }: { zoneMap: ZoneMap | undefined; tablesNotForSale: number[] }) {
  const zones = zoneMap?.zones ?? [];
  const tables = zoneMap?.tables ?? [];
  const perZone = zones.map((z) => {
    const ts = tables.filter((t) => t.zoneId === z.id);
    const forSale = ts.filter((t) => t.tableNumber === undefined || !tablesNotForSale.includes(t.tableNumber));
    return { zone: z, total: ts.length, forSale: forSale.length, seats: forSale.reduce((s, t) => s + (t.capacity ?? 0), 0) };
  });
  const total = perZone.reduce((a, z) => ({ forSale: a.forSale + z.forSale, seats: a.seats + z.seats }), { forSale: 0, seats: 0 });
  return (
    <Card title="Tables for sale and capacity per zone">
      <table className="table small" data-testid="sale-summary">
        <thead><tr><th>Zone</th><th className="num">For sale</th><th className="num">Seats</th></tr></thead>
        <tbody>
          {perZone.map((z) => <tr key={z.zone.id}><td>{zoneTitle(z.zone)}</td><td className="num">{z.forSale} of {z.total}</td><td className="num">{z.seats}</td></tr>)}
          {perZone.length === 0 && <tr><td colSpan={3} className="tiny">Choose a zone map above.</td></tr>}
          {perZone.length > 0 && <tr><td><b>Total</b></td><td className="num"><b>{total.forSale}</b></td><td className="num"><b>{total.seats}</b></td></tr>}
        </tbody>
      </table>
    </Card>
  );
}
