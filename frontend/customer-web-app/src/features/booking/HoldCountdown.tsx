import { mmss } from '../../app/format';

/** The mm:ss at the right of the app bar while the hold runs. */
export function HoldCountdown({ remaining, held }: { remaining: number | null; held: boolean }) {
  if (!held) return null;
  return <span data-testid="countdown" aria-label="time left on the hold">{mmss(remaining ?? 0)}</span>;
}
