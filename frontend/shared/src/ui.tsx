// Shared pieces of both apps: the alert box of every failed call, badges, and the table map of the wireframes
// (Appendix D: C3, B2, B3's preview, B4, B6): the stage, one block per zone, one shape per table whose fill shows the
// status by pattern and label, never by colour alone (available white, held hatched, booked grey, occupied dark,
// not for sale dotted); a tint per status is layered on top (green, amber, slate) so the map also reads at a glance. The shape stands for the table type: a circle for a round table, a wide rounded shape for a
// sofa or booth, a triangle for a single seat, a square otherwise. The label is the zone letter and the number (A12).
import type { ReactNode } from 'react';
import type { ApiError } from './api';
import type { RoundTableStatus, TableStatusValue } from './types';

export function ErrorAlert({ error, onClose }: { error: ApiError | null; onClose?: () => void }) {
  if (!error) return null;
  const details = error.details === undefined ? null : typeof error.details === 'string' ? error.details : JSON.stringify(error.details, null, 2);
  return (
    <div className="alert" role="alert">
      <strong>{error.status ? `Error ${error.status}` : 'Error'}</strong> {error.error}
      {onClose && <button type="button" className="link" onClick={onClose}>dismiss</button>}
      {details && <pre>{details}</pre>}
    </div>
  );
}

/** A pill: outlined by default, `fill` dark with white text (Confirmed, Sold out, Published), `hatch` striped (Held,
 *  Not yet open, Unsaved changes), `dim` for a past or cancelled thing, `ok` green (Saved). */
export const Badge = ({ children, solid, fill, hatch, dim, soft, ok }: { children: ReactNode; solid?: boolean; fill?: boolean; hatch?: boolean; dim?: boolean; soft?: boolean; ok?: boolean }) => (
  <span className={`badge${solid || fill ? ' fill' : ''}${hatch ? ' hatch' : ''}${dim || soft ? ' dim' : ''}${ok ? ' ok' : ''}`}>{children}</span>
);

export const STATUS_LABEL: Record<TableStatusValue, string> = {
  AVAILABLE: 'available', HELD: 'held', BOOKED: 'booked', OCCUPIED: 'occupied', NOT_FOR_SALE: 'not for sale',
};
export const STATUSES: TableStatusValue[] = ['AVAILABLE', 'HELD', 'BOOKED', 'OCCUPIED', 'NOT_FOR_SALE'];

/** tableNumber → status, from the polled read model. */
export function statusMap(status: RoundTableStatus | null): Map<number, TableStatusValue> {
  const m = new Map<number, TableStatusValue>();
  for (const t of status?.tables ?? []) if (t.tableNumber !== undefined && t.status) m.set(t.tableNumber, t.status);
  return m;
}

export function countByStatus(status: RoundTableStatus | null): Record<TableStatusValue, number> {
  const counts: Record<TableStatusValue, number> = { AVAILABLE: 0, HELD: 0, BOOKED: 0, OCCUPIED: 0, NOT_FOR_SALE: 0 };
  for (const t of status?.tables ?? []) if (t.status) counts[t.status] += 1;
  return counts;
}

// ---------------------------------------------------------------- shapes and labels
export type TableShape = 'circle' | 'square' | 'sofa' | 'seat';

/** The table as every map draws it; a RoundTable (C3, B3, B4) and a ZoneMapTable with its names looked up (B2) both fit. */
export interface GridTable {
  tableNumber?: number;
  zoneId?: string;
  zoneName?: string;
  tableTypeId?: string;
  tableTypeName?: string;
  capacity?: number;
  forSale?: boolean;
  packagePrice?: number;
  packageContent?: string;
}

/** The shape of a table type, from its name or id, else from its capacity. */
export function shapeOf(t: { tableTypeName?: string; tableTypeId?: string; capacity?: number }): TableShape {
  const name = `${t.tableTypeName ?? ''} ${t.tableTypeId ?? ''}`.toLowerCase();
  if (/round|circle/.test(name)) return 'circle';
  if (/sofa|booth|lounge|couch/.test(name)) return 'sofa';
  if (/seat|stool|single/.test(name)) return 'seat';
  if (/square/.test(name)) return 'square';
  if (t.capacity === 1) return 'seat';
  if (t.capacity === 2) return 'circle';
  if ((t.capacity ?? 0) >= 6) return 'sofa';
  return 'square';
}

/** The symbol of a shape in running text, as the price lines of C3 use it: ○ 2 p 2,400 · □ 4 p 4,800 · sofa 6 p 7,200. */
export const SHAPE_SYMBOL: Record<TableShape, string> = { circle: '○', square: '□', sofa: 'sofa', seat: '△' };

/** "A12": the zone id when it is a short code, then the table number; "12" when the zone has a long id or none. */
export const tableLabel = (zoneId: string | undefined, tableNumber: number | undefined): string =>
  `${zoneId && /^[A-Za-z0-9]{1,2}$/.test(zoneId) ? zoneId.toUpperCase() : ''}${tableNumber ?? ''}`;

// ---------------------------------------------------------------- the shapes as SVG
const W = 60, H = 44;
const FILL: Record<TableStatusValue, string> = { AVAILABLE: '#fff', HELD: 'url(#seats-hatch)', BOOKED: '#6b7a90', OCCUPIED: '#2b2f36', NOT_FOR_SALE: '#eeeeee' };
const STROKE: Record<TableStatusValue, string> = { AVAILABLE: '#2f7d4a', HELD: '#b7791f', BOOKED: '#4a5568', OCCUPIED: '#1a1d22', NOT_FOR_SALE: '#aaaaaa' };
const INK: Record<TableStatusValue, string> = { AVAILABLE: '#222', HELD: '#5c3d00', BOOKED: '#fff', OCCUPIED: '#fff', NOT_FOR_SALE: '#999' };
const ACCENT = '#2457c5';

function ShapePath({ shape, status, selected }: { shape: TableShape; status: TableStatusValue; selected?: boolean }) {
  const common = { fill: FILL[status], stroke: selected ? ACCENT : STROKE[status], strokeWidth: selected ? 3 : 1.6, strokeDasharray: status === 'NOT_FOR_SALE' ? '3 3' : undefined };
  switch (shape) {
    case 'circle': return <circle cx={W / 2} cy={H / 2} r={19} {...common} />;
    case 'sofa': return <rect x={3} y={6} width={W - 6} height={H - 12} rx={10} {...common} />;
    case 'seat': return <polygon points={`${W / 2},3 ${W - 6},${H - 3} 6,${H - 3}`} {...common} />;
    default: return <rect x={10} y={3} width={W - 20} height={H - 6} rx={2} {...common} />;
  }
}

/** The hatch pattern every held shape and the legend reference; rendered once per map. */
const Defs = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
    <defs>
      <pattern id="seats-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="#fff7e0" /><rect width="3" height="6" fill="#e0a52a" />
      </pattern>
    </defs>
  </svg>
);

export function TableShapeSvg({ shape, status, label, selected, size = 1 }: { shape: TableShape; status: TableStatusValue; label: string; selected?: boolean; size?: number }) {
  return (
    <svg className={`tbl-shape shape-${shape} status-${status.toLowerCase()}`} viewBox={`-4 -4 ${W + 8} ${H + 8}`} width={(W + 8) * size} height={(H + 8) * size} aria-hidden="true">
      {selected && <rect x={-3} y={-3} width={W + 6} height={H + 6} rx={shape === 'circle' ? (W + 6) / 2 : 6} fill="none" stroke={ACCENT} strokeWidth={1.5} strokeDasharray="3 3" />}
      <ShapePath shape={shape} status={status} selected={selected} />
      <text x={W / 2} y={shape === 'seat' ? H - 9 : H / 2 + 4} textAnchor="middle" fontSize={label.length > 3 ? 10 : 12} fontWeight={700} fill={INK[status]}>{label}</text>
    </svg>
  );
}

/** The legend of C3 and B4: the four (or five) statuses as swatches with their names. */
export function StatusLegend({ statuses = ['AVAILABLE', 'HELD', 'BOOKED'], labels }: { statuses?: TableStatusValue[]; labels?: Partial<Record<TableStatusValue, string>> }) {
  return (
    <div className="legend">
      <Defs />
      {statuses.map((s) => (
        <span key={s}>
          <svg className="sw" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><rect x="1" y="1" width="14" height="14" rx="3" fill={FILL[s]} stroke={STROKE[s]} strokeWidth="1.3" strokeDasharray={s === 'NOT_FOR_SALE' ? '2 2' : undefined} /></svg>
          {labels?.[s] ?? STATUS_LABEL[s]}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- the map
export interface TableGridProps {
  tables: GridTable[];
  /** The zones in the map's order with their names; derived from the tables when absent. */
  zones?: { id: string; name?: string }[];
  /** Absent: draw the map without live status (B2, the preview of B3): for sale, or not. */
  status?: Map<number, TableStatusValue>;
  /** Only an AVAILABLE table is clickable (C3). */
  onPick?: (table: GridTable) => void;
  /** Every table is clickable and the selected one is ringed (B2). */
  selected?: number;
  onSelect?: (table: GridTable) => void;
  busy?: boolean;
  /** Something under the shapes of a zone, such as its price line (C3). */
  zoneFooter?: (zone: { id: string; name?: string; tables: GridTable[] }) => ReactNode;
  stage?: boolean;
  size?: number;
}

interface ZoneGroup { id: string; name?: string; tables: GridTable[] }

export function TableGrid({ tables, zones, status, onPick, selected, onSelect, busy, zoneFooter, stage = true, size = 1 }: TableGridProps) {
  const groups: ZoneGroup[] = (zones ?? []).map((z) => ({ id: z.id, name: z.name, tables: [] }));
  for (const t of [...tables].sort((a, b) => (a.tableNumber ?? 0) - (b.tableNumber ?? 0))) {
    const id = t.zoneId ?? '';
    let z = groups.find((g) => g.id === id);
    if (!z) { z = { id, name: t.zoneName, tables: [] }; groups.push(z); }
    if (!z.name && t.zoneName) z.name = t.zoneName;
    z.tables.push(t);
  }
  return (
    <div className="table-map">
      <Defs />
      {stage && <div className="stage">STAGE</div>}
      {groups.length === 0 && <p className="muted">No tables yet.</p>}
      {groups.map((z) => (
        <section key={z.id || '(none)'} className="zone" data-zone={z.id}>
          <h4 className="zone-name">{z.id ? `Zone ${z.id.toUpperCase()}` : '(no zone)'}{z.name && z.name !== `Zone ${z.id}` ? ` · ${z.name}` : ''}</h4>
          {z.tables.length === 0 && <p className="muted small">No table in this zone.</p>}
          <div className="tables">
            {z.tables.map((t, i) => {
              const s: TableStatusValue = status?.get(t.tableNumber ?? -1) ?? (t.forSale === false ? 'NOT_FOR_SALE' : 'AVAILABLE');
              const pickable = Boolean(onPick) && s === 'AVAILABLE' && !busy;
              const clickable = pickable || Boolean(onSelect);
              const label = tableLabel(t.zoneId, t.tableNumber);
              const type = t.tableTypeName ?? t.tableTypeId ?? 'table';
              return (
                <button key={`${t.tableNumber}-${i}`} type="button" className={`table-btn status-${s.toLowerCase()}${selected === t.tableNumber ? ' selected' : ''}`} disabled={!clickable}
                  onClick={() => (onSelect ? onSelect(t) : onPick?.(t))}
                  aria-label={`table ${t.tableNumber}, ${STATUS_LABEL[s]}`}
                  title={`${label} · ${type}${t.capacity !== undefined ? ` · ${t.capacity} seats` : ''}${t.packagePrice !== undefined ? ` · ${t.packagePrice.toLocaleString('en-US')} THB` : ''} · ${STATUS_LABEL[s]}`}>
                  <TableShapeSvg shape={shapeOf(t)} status={s} label={label} selected={selected === t.tableNumber} size={size} />
                </button>
              );
            })}
          </div>
          {zoneFooter?.(z)}
        </section>
      ))}
    </div>
  );
}
