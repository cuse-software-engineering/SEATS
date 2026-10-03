// The words and dates the back-office screens share: the role names, "Sat 26 Sep 2026 · 20:00" for a round, the
// clock of the live view, the title of a zone.
import { fmtClock, fmtDay, type StaffRole } from '@seats/frontend-shared';

export const ROLE_NAME: Record<StaffRole, string> = { manager: 'Manager', front_staff: 'Front staff', owner: 'Owner' };

export const plural = (n: number, word: string, pluralWord = `${word}s`): string => `${n} ${n === 1 ? word : pluralWord}`;

/** "Sat 26 Sep 2026 · 20:00": the venue's date of a round and its start in the browser's clock; a fresh draft has none. */
export const roundWhen = (r: { date?: string; startAt?: string }): string => (r.date ? `${fmtDay(r.date)} · ${fmtClock(r.startAt)}` : 'No date yet');
/** "Sat 26 Sep · 20:00", the short form of the phone's app bar. */
export const roundWhenShort = (r: { date?: string; startAt?: string }): string =>
  r.date ? `${fmtDay(r.date).replace(/ \d{4}$/, '')} · ${fmtClock(r.startAt)}` : 'No date yet';
/** "19:05:12", the clock of the live view. */
export const clockWithSeconds = (d: Date): string => d.toLocaleTimeString('en-GB', { hour12: false });
/** "Zone A · Front stage". */
export const zoneTitle = (z: { id?: string; name?: string }): string => `Zone ${(z.id ?? '').toUpperCase()}${z.name ? ` · ${z.name}` : ''}`;
export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
