import type { UpcomingRound } from '@seats/frontend-shared';

export type RoundKind = 'open' | 'not yet open' | 'sold out';

/** Open, not yet open (the booking-open time is ahead), or sold out (no table left of those for sale). */
export function kindOf(r: UpcomingRound, now: number): RoundKind {
  const opensAt = r.bookingOpenAt ? new Date(r.bookingOpenAt).getTime() : NaN;
  if (r.status === 'not yet open' || (Number.isFinite(opensAt) && opensAt > now)) return 'not yet open';
  if (r.status === 'sold out' || (r.availableTables === 0 && (r.tablesForSale ?? 0) > 0)) return 'sold out';
  return 'open';
}

/** "Opens in 9 days" */
export function opensIn(bookingOpenAt: string | undefined, now: number): string {
  const ms = bookingOpenAt ? new Date(bookingOpenAt).getTime() - now : NaN;
  if (!Number.isFinite(ms) || ms <= 0) return 'Opens soon';
  const hours = Math.ceil(ms / 3600e3);
  if (hours < 24) return `Opens in ${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.ceil(ms / 864e5);
  return `Opens in ${days} day${days === 1 ? '' : 's'}`;
}

/** Rounds in date order, the earliest first. */
export const byDate = (a: UpcomingRound, b: UpcomingRound): number =>
  `${a.date ?? ''}${a.startAt ?? ''}`.localeCompare(`${b.date ?? ''}${b.startAt ?? ''}`);
