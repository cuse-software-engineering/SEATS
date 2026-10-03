// The local state of the round editor: the form (a draft of the loaded round until Save), the last validation result
// (cleared by any change) and the checks said under the fields before the server validates the round.
import { useCallback, useEffect, useState } from 'react';
import { fromLocalInput, type PackagePrice, type Round, type RoundUpdate, toLocalInput, type ValidationResult } from '@seats/frontend-shared';

export interface RoundForm { name: string; artist: string; date: string; doorsOpenAt: string; startAt: string; bookingOpenAt: string; zoneMapId: string; tablesNotForSale: number[]; prices: PackagePrice[] }
export const EMPTY_FORM: RoundForm = { name: '', artist: '', date: '', doorsOpenAt: '', startAt: '', bookingOpenAt: '', zoneMapId: '', tablesNotForSale: [], prices: [] };
interface State { id: string | null; form: RoundForm; dirty: boolean; saved: boolean }
const EMPTY: State = { id: null, form: EMPTY_FORM, dirty: false, saved: false };

export const fromRound = (r: Round): RoundForm => ({
  name: r.name ?? '', artist: r.artist ?? '', date: r.date ?? '', doorsOpenAt: toLocalInput(r.doorsOpenAt), startAt: toLocalInput(r.startAt),
  bookingOpenAt: toLocalInput(r.bookingOpenAt), zoneMapId: r.zoneMapId ?? '', tablesNotForSale: r.tablesNotForSale ?? [], prices: r.prices ?? [],
});

const sameTime = (a: string | undefined, b: string | undefined): boolean => (a ? Date.parse(a) : NaN) === (b ? Date.parse(b) : NaN) || (!a && !b);
const sameList = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** The fields of the form that differ from the loaded round: a published round refuses any field it keeps, so only
 *  what changed is sent. */
export function changedFields(f: RoundForm, r: Round): RoundUpdate {
  const u: RoundUpdate = {};
  if (f.name !== (r.name ?? '')) u.name = f.name;
  if (f.artist !== (r.artist ?? '')) u.artist = f.artist;
  if (f.date !== (r.date ?? '')) u.date = f.date;
  const doors = fromLocalInput(f.doorsOpenAt), start = fromLocalInput(f.startAt), opens = fromLocalInput(f.bookingOpenAt);
  if (!sameTime(doors, r.doorsOpenAt)) u.doorsOpenAt = doors ?? '';
  if (!sameTime(start, r.startAt)) u.startAt = start ?? '';
  if (!sameTime(opens, r.bookingOpenAt)) u.bookingOpenAt = opens ?? '';
  if (f.zoneMapId !== (r.zoneMapId ?? '')) u.zoneMapId = f.zoneMapId;
  if (!sameList(f.tablesNotForSale, r.tablesNotForSale ?? [])) u.tablesNotForSale = f.tablesNotForSale;
  const prices = f.prices.filter((p) => p.packagePrice !== undefined && Number.isFinite(p.packagePrice));
  if (!sameList(prices, r.prices ?? [])) u.prices = prices;
  return u;
}

export interface FormErrors { doorsOpenAt?: string; bookingOpenAt?: string }
/** The checks a form can make before the server does: the times in order. */
export function formErrors(f: RoundForm): FormErrors {
  const t = (v: string) => (v ? new Date(v).getTime() : NaN);
  const e: FormErrors = {};
  if (f.doorsOpenAt && f.startAt && !(t(f.doorsOpenAt) < t(f.startAt))) e.doorsOpenAt = 'Must be before the start';
  if (f.bookingOpenAt && f.startAt && !(t(f.bookingOpenAt) < t(f.startAt))) e.bookingOpenAt = 'Must be before the start';
  return e;
}

export function useRoundEditor(round: Round | undefined) {
  const [state, setState] = useState<State>(EMPTY);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const id = round?.id ?? null;
  useEffect(() => { setValidation(null); }, [id]);
  useEffect(() => {
    const roundId = round?.id;
    if (!round || !roundId) { setState(EMPTY); return; }
    setState((s) => (s.id === roundId && s.dirty ? s : { id: roundId, form: fromRound(round), dirty: false, saved: s.id === roundId && s.saved }));
  }, [round]);

  const edit = useCallback((patch: Partial<RoundForm> | ((f: RoundForm) => Partial<RoundForm>)) => {
    setState((s) => ({ ...s, form: { ...s.form, ...(typeof patch === 'function' ? patch(s.form) : patch) }, dirty: true, saved: false }));
    setValidation(null);
  }, []);
  const loadSaved = useCallback((r: Round) => setState({ id: r.id ?? null, form: fromRound(r), dirty: false, saved: true }), []);
  const setPrice = (zoneId: string, tableTypeId: string, patch: Partial<PackagePrice>) => edit((f) => {
    const i = f.prices.findIndex((p) => p.zoneId === zoneId && p.tableTypeId === tableTypeId);
    return { prices: i >= 0 ? f.prices.map((p, j) => (j === i ? { ...p, ...patch } : p)) : [...f.prices, { zoneId, tableTypeId, ...patch }] };
  });
  const mark = (n: number) => edit((f) => ({ tablesNotForSale: f.tablesNotForSale.includes(n) ? f.tablesNotForSale : [...f.tablesNotForSale, n].sort((a, b) => a - b) }));
  const unmark = (n: number) => edit((f) => ({ tablesNotForSale: f.tablesNotForSale.filter((x) => x !== n) }));

  return { form: state.form, dirty: state.dirty, saved: state.saved, edit, loadSaved, validation, setValidation, setPrice, mark, unmark };
}
