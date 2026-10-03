import type { Booking, Round } from '@seats/frontend-shared';
import { fmtDayMonth, mmss, typeLabel } from '../../app/format';

/** The muted detail line of a booking card, by status. */
export function bookingDetail(b: Booking, round: Round | undefined, me: string | undefined, remaining: number | null): string {
  const type = typeLabel(round?.tables?.find((t) => t.tableNumber === b.tableNumber) ?? b);
  const party = b.partySize !== undefined ? ` · party size ${b.partySize}` : '';
  switch (b.status) {
    case 'Held': return remaining !== null && remaining > 0 ? `Hold ends in ${mmss(remaining)} · pay to confirm` : 'Hold ending…';
    case 'Confirmed': return `${type}${party} · paid in full`;
    case 'Checked-in': return `${type}${party} · checked in`;
    case 'Cancelled': {
      const at = b.history?.find((h) => h.status === 'Cancelled');
      return `Cancelled ${at?.by && at.by === me ? 'by you' : 'by the venue'}${at?.at ? ` on ${fmtDayMonth(at.at)}` : ''} · nothing charged`;
    }
    case 'Expired': return 'Hold expired before payment · nothing charged';
    case 'No-show': return `${type}${party} · no-show, the fee is not refunded`;
    default: return type;
  }
}
