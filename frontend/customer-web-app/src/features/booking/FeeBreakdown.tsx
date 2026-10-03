import type { Fee } from '@seats/frontend-shared';
import { thb } from '../../app/format';

/** Package price, extra-person fee and the full table fee the customer pays now (BRULE-01, BRULE-08, BRULE-09). */
export function FeeBreakdown({ fee, packagePrice }: { fee: Fee | null | undefined; packagePrice: number | undefined }) {
  return (
    <div data-testid="fee">
      <div className="row"><span>Package price</span><span>{thb(fee?.packagePrice ?? packagePrice)}</span></div>
      <div className="row" data-testid="fee-extra"><span>Extra-person fee</span><span>{fee ? thb((fee.extraPersons ?? 0) * (fee.extraPersonFee ?? 0)) : '–'}</span></div>
      <div className="row b fee-total"><span>Full table fee</span><span data-testid="fee-total">{thb(fee?.fullTableFee)}</span></div>
      <div className="tiny">{fee ? 'Paid in full now; nothing to pay at the venue.' : 'Set the party size to see the full table fee.'}</div>
    </div>
  );
}
