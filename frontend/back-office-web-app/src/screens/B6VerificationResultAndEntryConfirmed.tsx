import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, ApiError, Badge, type Booking, ErrorAlert, fmtDateTime, fmtTHB, useAction, useSession } from '@seats/frontend-shared';
import type { ScanState } from './B5CheckInScanner';

/** B6 Verification result and entry confirmed (UC-02 steps 3–8): the result panel with the reason of a failure, the
 *  booking with the party size paid for, Confirm entry (POST /api/check-ins), then the Checked-in banner, Next scan. */
export default function B6VerificationResultAndEntryConfirmed() {
  const scan = useLocation().state as ScanState | null;
  const session = useSession();
  const action = useAction();
  const [checkedIn, setCheckedIn] = useState<Booking | null>(null);
  const [at, setAt] = useState<string | null>(null);

  if (!scan) return <><h1>Verification result</h1><p className="muted">No scan yet. <Link to="/check-in">Scan a ticket</Link>.</p></>;
  const verifyError = scan.error ? new ApiError(scan.error.status, scan.error.error, scan.error.details) : null;
  const b = checkedIn ?? scan.result?.booking ?? null;

  const confirmEntry = async () => {
    const r = await action.run(() => api.post<Booking>('/api/check-ins', { bookingReference: scan.reference }));
    if (r) { setCheckedIn(r); setAt(new Date().toISOString()); }
  };

  return (
    <>
      <h1>Verification result</h1>
      {checkedIn && <div className="banner">Checked in at {fmtDateTime(at)} by {session?.label ?? session?.userId}</div>}
      {verifyError && <div className="notice">{verifyError.status === 501 ? 'Check-in comes in progress 2.' : 'The reference could not be verified.'}</div>}
      <ErrorAlert error={verifyError} />
      <ErrorAlert error={action.error} onClose={action.clear} />
      <div className="card" style={{ maxWidth: 520 }}>
        <p>Booking reference <strong>{scan.reference}</strong></p>
        {scan.result && (
          scan.result.valid
            ? <p><Badge solid>valid ticket</Badge></p>
            : <div className="alert">Not valid: {scan.result.reason ?? 'no reason given'}</div>
        )}
        {b && (
          <table className="data">
            <tbody>
              <tr><th>Booking</th><td><code>{b.id}</code> <Badge>{b.status}</Badge></td></tr>
              <tr><th>Table</th><td>#{b.tableNumber} · {b.zoneName ?? b.zoneId} · {b.capacity} seats</td></tr>
              <tr><th>Party size paid for</th><td><strong>{b.partySize ?? '–'}</strong> · {fmtTHB(b.fee?.fullTableFee)}</td></tr>
              <tr><th>Customer</th><td><code>{b.customerId}</code></td></tr>
            </tbody>
          </table>
        )}
        <div className="row">
          <button type="button" onClick={confirmEntry} disabled={action.busy || Boolean(checkedIn) || !scan.result?.valid}>Confirm entry</button>
          <Link className="btn secondary" to="/check-in">Next scan</Link>
        </div>
      </div>
    </>
  );
}
