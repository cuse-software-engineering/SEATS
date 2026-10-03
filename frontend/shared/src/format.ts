// Display helpers: money in THB, RFC 3339 times in the browser's locale, datetime-local inputs.
export const fmtTHB = (n: number | undefined | null): string => (n === undefined || n === null ? '–' : `฿${n.toLocaleString('en-US')}`);

export const fmtDateTime = (iso: string | undefined | null): string =>
  iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '–';

export const fmtTime = (iso: string | undefined | null): string =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { timeStyle: 'short' }) : '–';

export const fmtDate = (date: string | undefined | null): string => date || '–';

const pad = (n: number) => String(n).padStart(2, '0');

/** RFC 3339 → the value of an <input type="datetime-local"> in local time. */
export function toLocalInput(iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The value of an <input type="datetime-local"> → RFC 3339 in UTC; empty stays undefined (the field is left out). */
export const fromLocalInput = (value: string): string | undefined => (value ? new Date(value).toISOString() : undefined);

export const mmss = (seconds: number): string => `${pad(Math.floor(Math.max(0, seconds) / 60))}:${pad(Math.max(0, seconds) % 60)}`;

// en-US parts: en-GB prints "Sept" for September on current ICU builds, and the screens and the tests say "Sep"
const DAY: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
const part = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
const dayParts = (d: Date) => new Intl.DateTimeFormat('en-US', DAY).formatToParts(d);
/** "Sat 26 Sep 2026" from an RFC 3339 time or a YYYY-MM-DD date (the venue's calendar date, shown as given);
 *  `year` false drops the year ("Sat 26 Sep"). */
export function fmtDay(value: string | undefined | null, year = true): string {
  if (!value) return '–';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const p = dayParts(d);
  return `${part(p, 'weekday')} ${part(p, 'day')} ${part(p, 'month')}${year ? ` ${part(p, 'year')}` : ''}`;
}
/** "20:00" in the browser's time zone. */
export const fmtClock = (iso: string | undefined | null): string => (iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '–');
/** "Sat 26 Sep 2026 · 20:00", the way every screen names a round or a time. */
export const fmtWhen = (iso: string | undefined | null): string => (iso ? `${fmtDay(iso)} · ${fmtClock(iso)}` : '–');
/** "5,400 THB" as the texts write money; fmtTHB gives the "฿5,400" of the tables. */
export const thb = (n: number | undefined | null): string => (n === undefined || n === null ? '–' : `${n.toLocaleString('en-US')} THB`);
