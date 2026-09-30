// Shared pieces of both apps: the alert box of every failed call, badges, and the table map drawn as a grid of
// buttons whose label and pattern show the status (Appendix D, C3 and B4; the preview of B3).
import type { ReactNode } from 'react';
import type { ApiError } from './api';
import { fmtTHB } from './format';
import type { RoundTable, RoundTableStatus, TableStatusValue } from './types';

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

export const Badge = ({ children, solid, soft }: { children: ReactNode; solid?: boolean; soft?: boolean }) => (
  <span className={`badge${solid ? ' solid' : ''}${soft ? ' soft' : ''}`}>{children}</span>
);

export const STATUS_LABEL: Record<TableStatusValue, string> = {
  AVAILABLE: 'available', HELD: 'held', BOOKED: 'booked', OCCUPIED: 'occupied', NOT_FOR_SALE: 'not for sale',
};
const STATUSES: TableStatusValue[] = ['AVAILABLE', 'HELD', 'BOOKED', 'OCCUPIED', 'NOT_FOR_SALE'];

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

export interface TableGridProps {
  tables: RoundTable[];
  /** Absent: draw the map without live status (the preview of B3). */
  status?: Map<number, TableStatusValue>;
  /** Only an AVAILABLE table is clickable. */
  onPick?: (table: RoundTable) => void;
  busy?: boolean;
}

interface ZoneGroup { id: string; name: string; tables: RoundTable[] }

export function TableGrid({ tables, status, onPick, busy }: TableGridProps) {
  const zones: ZoneGroup[] = [];
  for (const t of [...tables].sort((a, b) => (a.tableNumber ?? 0) - (b.tableNumber ?? 0))) {
    const id = t.zoneId ?? '';
    let z = zones.find((g) => g.id === id);
    if (!z) { z = { id, name: t.zoneName ?? (id ? `Zone ${id}` : 'No zone'), tables: [] }; zones.push(z); }
    z.tables.push(t);
  }
  return (
    <div className="table-map">
      <div className="stage">STAGE</div>
      {zones.length === 0 && <p className="muted">This round has no tables yet.</p>}
      {zones.map((z) => (
        <section key={z.id} className="zone">
          <h4>{z.name}</h4>
          <div className="tables">
            {z.tables.map((t) => {
              const s: TableStatusValue = status?.get(t.tableNumber ?? -1) ?? (t.forSale === false ? 'NOT_FOR_SALE' : 'AVAILABLE');
              const clickable = Boolean(onPick) && s === 'AVAILABLE' && !busy;
              return (
                <button key={t.tableNumber} type="button" className={`table-btn status-${s.toLowerCase()}`} disabled={!clickable}
                  onClick={() => onPick?.(t)} aria-label={`table ${t.tableNumber}, ${STATUS_LABEL[s]}`}>
                  <span className="num">#{t.tableNumber}</span>
                  <span className="type">{t.tableTypeName ?? t.tableTypeId ?? 'table'} · {t.capacity ?? '?'} seats</span>
                  <span className="price">{t.packagePrice === undefined ? 'no price yet' : fmtTHB(t.packagePrice)}</span>
                  <span className="state">{status ? STATUS_LABEL[s] : t.forSale === false ? 'not for sale' : 'for sale'}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <div className="legend">
        {STATUSES.map((s) => <span key={s}><i className={`swatch status-${s.toLowerCase()}`} /> {STATUS_LABEL[s]}</span>)}
      </div>
    </div>
  );
}
