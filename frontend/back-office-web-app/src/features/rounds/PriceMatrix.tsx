import { Card, type PackagePrice, type TableType, type ZoneMap } from '@seats/frontend-shared';
import { zoneTitle } from '../../app/format';

/** "Package price and content per zone and table type": one row per table type of the map, one column per zone;
 *  a cell holds the price in THB and the package content; a missing price is outlined. */
export function PriceMatrix({ zoneMap, types, prices, onChange, disabled }: {
  zoneMap: ZoneMap | undefined; types: TableType[]; prices: PackagePrice[]; onChange: (zoneId: string, tableTypeId: string, patch: Partial<PackagePrice>) => void; disabled: boolean;
}) {
  const zones = zoneMap?.zones ?? [];
  const tables = zoneMap?.tables ?? [];
  const rows = types.filter((ty) => tables.some((t) => t.tableTypeId === ty.id));
  const occurs = (zoneId: string | undefined, typeId: string) => tables.some((t) => t.zoneId === zoneId && t.tableTypeId === typeId);
  return (
    <Card title="Package price and content per zone and table type">
      <table className="table matrix" data-testid="prices">
        <thead><tr><th style={{ width: 96 }}>Table type</th>{zones.map((z) => <th key={z.id}>{zoneTitle(z)}</th>)}</tr></thead>
        <tbody>
          {rows.map((ty) => (
            <tr key={ty.id}>
              <td>{ty.name}</td>
              {zones.map((z) => {
                if (!occurs(z.id, ty.id)) return <td key={z.id}><span className="tiny">none in this zone</span></td>;
                const p = prices.find((x) => x.zoneId === z.id && x.tableTypeId === ty.id);
                const missing = p?.packagePrice === undefined;
                return (
                  <td key={z.id} className={`cell-stack${missing ? ' err' : ''}`}>
                    <input type="number" min={0} className="input price" value={p?.packagePrice ?? ''} placeholder="price missing" aria-label={`price of ${ty.name} in ${zoneTitle(z)}, THB`} aria-invalid={missing || undefined} disabled={disabled}
                      onChange={(e) => onChange(z.id ?? '', ty.id, { packagePrice: e.target.value === '' ? undefined : Number(e.target.value) })} />
                    <input className="input" value={p?.packageContent ?? ''} placeholder="package content" aria-label={`package content of ${ty.name} in ${zoneTitle(z)}`} disabled={disabled}
                      onChange={(e) => onChange(z.id ?? '', ty.id, { packageContent: e.target.value })} />
                  </td>
                );
              })}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={1 + zones.length} className="tiny">Choose a zone map: its table types become the rows and its zones the columns, and every table for sale needs a price.</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}
