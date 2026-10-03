// Small pieces the back-office screens share: the dates as the wireframes write them ("Fri 9 Oct 2026 · 20:00"),
// the role names, the validation result box of B2 and B3.
import type { ReactNode } from 'react';
import { fmtTime, type StaffRole, type ValidationResult } from '@seats/frontend-shared';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Fri 9 Oct 2026" (or "Fri 9 Oct") from a venue-local date, YYYY-MM-DD. */
export function fmtDay(date: string | undefined | null, withYear = true): string {
  if (!date) return '–';
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return date;
  const dt = new Date(y, m - 1, d);
  return `${DAY[dt.getDay()]} ${d} ${MON[m - 1]}${withYear ? ` ${y}` : ''}`;
}

/** "Sat 26 Sep 2026 · 20:00": the date of the round and its start time. */
export const fmtWhen = (date: string | undefined | null, startAt: string | undefined | null, withYear = true): string =>
  `${fmtDay(date, withYear)} · ${fmtTime(startAt)}`;

/** "19:05:12", the clock of the live view. */
export const fmtClock = (d: Date): string => d.toLocaleTimeString('en-GB', { hour12: false });

export const ROLE_NAME: Record<StaffRole, string> = { manager: 'Manager', front_staff: 'Front Staff', owner: 'Owner' };

export const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The validation result box of B2 and B3: "Validation result · 2 problems" with the list, or "no problems"; and
 *  a hint about what the result opens (Activate, Publish). */
export function ValidationBox({ result, hint }: { result: ValidationResult; hint: ReactNode }) {
  const problems = result.problems ?? [];
  const ok = Boolean(result.valid) && problems.length === 0;
  return (
    <div className={`vbox${ok ? ' ok' : ''}`} data-testid="validation" role="status">
      <div className="t">Validation result · {ok ? 'no problems' : plural(problems.length, 'problem')}</div>
      {problems.length > 0 && <ul>{problems.map((p, i) => <li key={i}>{p}</li>)}</ul>}
      <div className="tiny" style={{ marginTop: 4 }}>{hint}</div>
    </div>
  );
}
