// Display helpers of the customer screens, in the words of the wireframes: "Sat 26 Sep 2026 · 20:00", "4,800 THB",
// "Zone A", "4-person square". Money, the clock and mm:ss come from the shared kit; the day is built here from
// en-US parts because the kit's en-GB formatter prints "Sept" for September on current ICU builds, where the
// wireframes (and the e2e helper) print "Sep". Dates and times are shown in the browser's time zone.
import { fmtClock, mmss, thb } from '@seats/frontend-shared';

export { fmtClock, mmss, thb };

const DAY = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' } as const;

const parse = (iso: string | undefined | null): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

function dayParts(d: Date): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat('en-US', DAY).formatToParts(d)) out[p.type] = p.value;
  return out;
}

/** "Sat 26 Sep 2026", or "Sat 26 Sep" without the year. */
export function fmtDay(iso: string | undefined | null, year = true): string {
  const d = parse(iso);
  if (!d) return '–';
  const p = dayParts(d);
  return `${p.weekday} ${p.day} ${p.month}${year ? ` ${p.year}` : ''}`;
}

/** "10 Sep": a day without its weekday and year (the cancellation date on My bookings). */
export function fmtDayMonth(iso: string | undefined | null): string {
  const d = parse(iso);
  if (!d) return '–';
  const p = dayParts(d);
  return `${p.day} ${p.month}`;
}

/** "Fri 18 Sep 18:00": a moment without the year (the booking-open time on a round card). */
export const fmtDayClock = (iso: string | undefined | null): string => (parse(iso) ? `${fmtDay(iso, false)} ${fmtClock(iso)}` : '–');

/** "Sat 26 Sep 2026 · 20:00": the start of the round; the venue date alone when the start is not set. */
export function roundTitle(r: { date?: string; startAt?: string } | null | undefined, year = true): string {
  if (!r) return '–';
  if (r.startAt) return `${fmtDay(r.startAt, year)} · ${fmtClock(r.startAt)}`;
  return r.date ? fmtDay(`${r.date}T00:00:00`, year) : '–';
}

/** "Zone A" for a short zone code; the zone's name otherwise. */
export function zoneLabel(zoneId: string | undefined, zoneName?: string): string {
  if (zoneId && /^[A-Za-z0-9]{1,2}$/.test(zoneId)) return `Zone ${zoneId.toUpperCase()}`;
  return zoneName ?? zoneId ?? '–';
}

/** "4-person square": the table type's name, else built from the capacity and the type id. */
export function typeLabel(t: { tableTypeName?: string; tableTypeId?: string; capacity?: number } | null | undefined): string {
  if (!t) return '–';
  if (t.tableTypeName) return t.tableTypeName;
  const type = t.tableTypeId ?? 'table';
  return t.capacity ? `${t.capacity}-person ${type}` : type;
}

/** "1 extra person" / "2 extra persons" */
export const extraPersons = (n: number): string => `${n} extra person${n === 1 ? '' : 's'}`;
