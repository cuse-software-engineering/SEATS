import { type RoundTable, SHAPE_SYMBOL, shapeOf } from '@seats/frontend-shared';
import { zoneLabel } from '../../app/format';

/** "Zone A: ○ 2 p 2,400 · □ 4 p 4,800 · sofa 6 p 7,200 THB": the table types of each zone with their package price. */
function priceLines(tables: RoundTable[]): { zone: string; line: string }[] {
  const zones = new Map<string, Map<string, { shape: string; capacity: number; price?: number }>>();
  for (const t of tables) {
    if (t.forSale === false) continue;
    const zone = t.zoneId ?? '';
    const entry = { shape: SHAPE_SYMBOL[shapeOf(t)], capacity: t.capacity ?? 0, price: t.packagePrice };
    const key = `${entry.shape}|${entry.capacity}|${entry.price ?? ''}`;
    if (!zones.has(zone)) zones.set(zone, new Map());
    zones.get(zone)!.set(key, entry);
  }
  return [...zones.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([zone, types]) => ({
    zone,
    line: [...types.values()].sort((a, b) => a.capacity - b.capacity || (a.price ?? 0) - (b.price ?? 0))
      .map((t) => `${t.shape} ${t.capacity} p${t.price !== undefined ? ` ${t.price.toLocaleString('en-US')}` : ''}`).join(' · ') + ' THB',
  }));
}

/** The price lines under the legend: one per zone, then the extra-person fee. */
export function PriceLines({ tables, extraFee }: { tables: RoundTable[]; extraFee?: number }) {
  return (
    <div className="tiny" data-testid="price-lines">
      {priceLines(tables).map((p) => <div key={p.zone}>{zoneLabel(p.zone)}: {p.line}</div>)}
      {extraFee !== undefined && <div>Extra person +{extraFee.toLocaleString('en-US')} THB each (added with the party size)</div>}
    </div>
  );
}
