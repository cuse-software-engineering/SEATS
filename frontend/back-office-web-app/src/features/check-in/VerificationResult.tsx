import { Link } from 'react-router-dom';
import { type Booking, Button, Divider, fmtTHB, KeyValue, tableLabel } from '@seats/frontend-shared';
import type { ScanState } from './scan-state';

/** The result of a verification: VALID with the booking, REFUSED with the reason, or NOT VERIFIED when the check
 *  could not be made; the key-value rows of the booking; Confirm entry. */
export function VerificationResult({ scan, onConfirm, confirming }: { scan: ScanState; onConfirm: () => void; confirming: boolean }) {
  const b = scan.result?.booking ?? null;
  const valid = Boolean(scan.result?.valid);
  const label = b ? tableLabel(b.zoneId, b.tableNumber) : '';
  const notAvailable = scan.error?.status === 501;
  return (
    <>
      {scan.error && (
        <div className="notice" role="status">
          {notAvailable ? 'Check-in is not available yet, so the reference could not be verified.' : `The reference could not be verified: ${scan.error.error}.`}
        </div>
      )}
      <div className={`result${scan.result ? (valid ? ' ok' : ' bad') : ''}`} data-testid="result">
        {scan.result && valid && <><div className="big">VALID</div><div className="muted">{b?.status === 'Confirmed' ? 'Confirmed booking' : b?.status ?? 'Booking'} · this round · not yet checked in</div></>}
        {scan.result && !valid && <><div className="big">REFUSED</div><div className="muted">{scan.result.reason ?? 'no reason given'}</div></>}
        {!scan.result && <><div className="big">NOT VERIFIED</div><div className="muted">reference {scan.reference}</div></>}
      </div>
      <KeyValue rows={[
        ['Reference', scan.reference],
        ['Table', <b key="t">{b ? `${label}${b.zoneName ? ` · ${b.zoneName}` : b.zoneId ? ` · Zone ${b.zoneId}` : ''}` : '–'}</b>],
        ['Type / package', b ? `${b.tableTypeId ?? '–'}${b.capacity !== undefined ? ` · ${b.capacity} seats` : ''}` : '–'],
        ['Party size paid', b?.partySize ?? '–'],
        ['Name', b?.customerId ?? '–'],
        ['Payment', payment(b)],
      ]} />
      <Divider />
      <Button variant="primary" block onClick={onConfirm} disabled={!valid} busy={confirming}>Confirm entry</Button>
      <div className="tiny" style={{ marginTop: 8 }}>A refused ticket shows the reason instead: already checked in (with time and staff), unknown, another round, window not open yet, after the grace period.</div>
      <Link className="btn block" to="/check-in" style={{ marginTop: 10 }}>Next scan</Link>
    </>
  );
}

const payment = (b: Booking | null): string => (b?.fee?.fullTableFee !== undefined ? `${b.status === 'Confirmed' ? 'Paid in full · ' : ''}${fmtTHB(b.fee.fullTableFee)}` : '–');
