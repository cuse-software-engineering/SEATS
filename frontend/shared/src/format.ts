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
