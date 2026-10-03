// The local state of the zone map editor: the zones and tables being edited (a draft of the loaded map until Save),
// the selected table and zone, the last validation result (cleared by any change, since it no longer describes the
// draft) and the problems of the selected table said under its fields.
import { useCallback, useEffect, useState } from 'react';
import type { TableType, ValidationResult, Zone, ZoneMap, ZoneMapTable } from '@seats/frontend-shared';

export interface MapDraft { id: string | null; zones: Zone[]; tables: ZoneMapTable[]; dirty: boolean; saved: boolean }
const EMPTY: MapDraft = { id: null, zones: [], tables: [], dirty: false, saved: false };

/** The next free zone letter: A, B, …, then Z1, Z2 … */
export function nextZoneId(zones: Zone[]): string {
  for (let i = 0; i < 26; i++) {
    const id = String.fromCharCode(65 + i);
    if (!zones.some((z) => z.id === id)) return id;
  }
  return `Z${zones.length + 1}`;
}

export function useZoneMapEditor(map: ZoneMap | undefined) {
  const [draft, setDraft] = useState<MapDraft>(EMPTY);
  const [sel, setSel] = useState<number | null>(null);          // the index in draft.tables of the selected table
  const [selZone, setSelZone] = useState<string | null>(null);  // the zone whose name is being edited
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const id = map?.id ?? null;
  useEffect(() => { setSel(null); setSelZone(null); setValidation(null); }, [id]);
  useEffect(() => {
    const mapId = map?.id;
    if (!map || !mapId) { setDraft(EMPTY); return; }
    // the server's version replaces the draft unless there are unsaved changes to the same map
    setDraft((d) => (d.id === mapId && d.dirty ? d : { id: mapId, zones: map.zones ?? [], tables: map.tables ?? [], dirty: false, saved: d.id === mapId && d.saved }));
  }, [map]);

  const edit = useCallback((fn: (d: MapDraft) => Partial<MapDraft>) => {
    setDraft((d) => ({ ...d, ...fn(d), dirty: true, saved: false }));
    setValidation(null);
  }, []);
  const loadSaved = useCallback((saved: ZoneMap) => setDraft({ id: saved.id ?? null, zones: saved.zones ?? [], tables: saved.tables ?? [], dirty: false, saved: true }), []);

  const current = sel !== null ? draft.tables[sel] : undefined;
  const setCurrent = (patch: Partial<ZoneMapTable>) => edit((d) => ({ tables: d.tables.map((t, i) => (i === sel ? { ...t, ...patch } : t)) }));
  const addTable = () => {
    const index = draft.tables.length;
    edit((d) => {
      const next = Math.max(0, ...d.tables.map((t) => t.tableNumber ?? 0)) + 1;
      const like = sel !== null ? d.tables[sel] : undefined;
      return { tables: [...d.tables, { tableNumber: next, zoneId: like?.zoneId ?? d.zones[0]?.id, tableTypeId: like?.tableTypeId, capacity: like?.capacity, x: 0, y: 0 }] };
    });
    setSel(index);
  };
  const removeTable = () => { edit((d) => ({ tables: d.tables.filter((_, i) => i !== sel) })); setSel(null); };
  const addZone = (name: string): string => {
    const zoneId = nextZoneId(draft.zones);
    edit((d) => ({ zones: [...d.zones, { id: zoneId, name }] }));
    setSelZone(zoneId);
    return zoneId;
  };
  const renameZone = (zoneId: string, name: string) => edit((d) => ({ zones: d.zones.map((z) => (z.id === zoneId ? { ...z, name } : z)) }));
  const removeZone = (zoneId: string) => { edit((d) => ({ zones: d.zones.filter((z) => z.id !== zoneId) })); setSelZone(null); };

  return { draft, sel, setSel, selZone, setSelZone, validation, setValidation, current, setCurrent, addTable, removeTable, addZone, renameZone, removeZone, loadSaved };
}

export interface TableProblems { number?: string; zone?: string; type?: string; capacity?: string }

/** What is wrong with the table at `index`, said under its fields before the server validates the map. */
export function tableProblems(draft: MapDraft, index: number | null, types: TableType[]): TableProblems {
  if (index === null) return {};
  const t = draft.tables[index];
  if (!t) return {};
  const p: TableProblems = {};
  if (!t.tableNumber || t.tableNumber < 1) p.number = 'Give the table a number';
  else if (draft.tables.some((o, i) => i !== index && o.tableNumber === t.tableNumber)) p.number = `Number ${t.tableNumber} is used by another table`;
  if (!t.zoneId || !draft.zones.some((z) => z.id === t.zoneId)) p.zone = 'Put the table in a zone';
  if (!t.tableTypeId || !types.some((ty) => ty.id === t.tableTypeId)) p.type = 'Choose a table type';
  if (!t.capacity || t.capacity < 1) p.capacity = 'At least 1 seat';
  return p;
}

export interface ZoneRow { key: string; zone: Zone | null; title: string; tables: number; seats: number | undefined }

/** The tables and the seats of each zone, and a last row for tables in no zone. */
export function zoneRows(draft: MapDraft): ZoneRow[] {
  const rows: ZoneRow[] = draft.zones.map((z) => {
    const ts = draft.tables.filter((t) => t.zoneId === z.id);
    const caps = ts.map((t) => t.capacity).filter((c): c is number => typeof c === 'number' && c > 0);
    return { key: z.id ?? '', zone: z, title: '', tables: ts.length, seats: caps.length ? caps.reduce((a, b) => a + b, 0) : undefined };
  });
  const orphans = draft.tables.filter((t) => !draft.zones.some((z) => z.id === t.zoneId));
  if (orphans.length) rows.push({ key: '(none)', zone: null, title: '(no zone)', tables: orphans.length, seats: undefined });
  return rows;
}
