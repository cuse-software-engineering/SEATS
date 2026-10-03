import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  api, ApiError, type Booking, ErrorAlert, fmtTHB, fmtTime, type RoundTable, type RoundTableStatus, statusMap, TableGrid, tableLabel,
  useAction, useLoad, useSession,
} from '@seats/frontend-shared';
import type { ScanState } from './B5CheckInScanner';

/** B6 Verification result and entry confirmed (UC-02 steps 3–8; Table D.15), the two states of the wireframe on one
 *  phone screen: the result box (VALID with the booking, or the reason of a refusal), the key-value rows, Confirm
 *  entry (POST /api/check-ins); then "Checked in" with the time and the staff, the zone's mini map with the table
 *  highlighted, Next scan. Progress 1 answers 501 to the verification: the notice says so. */
export default function B6VerificationResultAndEntryConfirmed() {
  const scan = useLocation().state as ScanState | null;
  const session = useSession();
  const action = useAction();
  const [checkedIn, setCheckedIn] = useState<Booking | null>(null);
  const [at, setAt] = useState<string | null>(null);
  const roundId = checkedIn?.roundId ?? scan?.roundId ?? '';
  const tables = useLoad<RoundTable[] | null>(() => (checkedIn && roundId ? api.get<RoundTable[]>(`/api/rounds/${roundId}/tables`) : Promise.resolve(null)), [checkedIn, roundId]);
  const status = useLoad<RoundTableStatus | null>(() => (checkedIn && roundId ? api.get<RoundTableStatus>(`/api/rounds/${roundId}/table-status`) : Promise.resolve(null)), [checkedIn, roundId]);

  if (!scan) {
    return (
      <div className="phone-screen">
        <div className="appbar"><Link className="back" to="/check-in" aria-label="back to the scanner">‹</Link>Verification result</div>
        <div className="content"><div className="muted">No scan yet. <Link to="/check-in">Scan a ticket</Link>.</div></div>
      </div>
    );
  }
  const verifyError = scan.error ? new ApiError(scan.error.status, scan.error.error, scan.error.details) : null;
  const b = checkedIn ?? scan.result?.booking ?? null;
  const valid = Boolean(scan.result?.valid);
  const label = b ? tableLabel(b.zoneId, b.tableNumber) : '';

  const confirmEntry = async () => {
    const r = await action.run(() => api.post<Booking>('/api/check-ins', { bookingReference: scan.reference }));
    if (r) { setCheckedIn(r); setAt(new Date().toISOString()); }
  };

  if (checkedIn) {
    const zoneTables = (tables.data ?? []).filter((t) => t.zoneId === checkedIn.zoneId);
    return (
      <div className="phone-screen" data-testid="b6-confirmed">
        <div className="appbar">Entry confirmed</div>
        <div className="content">
          <div className="result">
            <div className="big">✓ Checked in</div>
            <div className="muted">{fmtTime(at)} · by {session?.label ?? session?.userId} · party size {checkedIn.partySize ?? '–'}</div>
          </div>
          <div className="b" style={{ marginTop: 6 }}>Guide the party to table {label}</div>
          <div className="muted">{checkedIn.zoneName ?? (checkedIn.zoneId ? `Zone ${checkedIn.zoneId}` : '')}</div>
          <ErrorAlert error={tables.error} />
          <ErrorAlert error={status.error} />
          {zoneTables.length > 0 && (
            <div className="mini-map"><TableGrid tables={zoneTables} status={statusMap(status.data)} selected={checkedIn.tableNumber} size={0.85} /></div>
          )}
          <div className="tiny">Live view updated: the Manager sees {label} as occupied.</div>
          <Link className="btn primary wide" to="/check-in">Next scan</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="phone-screen" data-testid="b6-result">
      <div className="appbar"><Link className="back" to="/check-in" aria-label="back to the scanner">‹</Link>Verification result</div>
      <div className="content">
        {verifyError && <div className="notice">{verifyError.status === 501 ? 'Check-in comes in progress 2: the reference could not be verified yet.' : 'The reference could not be verified.'}</div>}
        <ErrorAlert error={verifyError} />
        <ErrorAlert error={action.error} onClose={action.clear} />
        <div className="result" data-testid="result">
          {scan.result && valid && <><div className="big">VALID</div><div className="muted">{b?.status === 'Confirmed' ? 'Confirmed booking' : b?.status ?? 'Booking'} · tonight's round · not yet checked in</div></>}
          {scan.result && !valid && <><div className="big">REFUSED</div><div className="muted">{scan.result.reason ?? 'no reason given'}</div></>}
          {!scan.result && <><div className="big">NOT VERIFIED</div><div className="muted">reference {scan.reference}</div></>}
        </div>
        <div className="kv">
          <span className="k">Reference</span><span>{scan.reference}</span>
          <span className="k">Table</span><span className="b">{b ? <>{label}{b.zoneName ? ` · ${b.zoneName}` : b.zoneId ? ` · Zone ${b.zoneId}` : ''}</> : '–'}</span>
          <span className="k">Type / package</span><span>{b ? `${b.tableTypeId ?? '–'}${b.capacity !== undefined ? ` · ${b.capacity} seats` : ''}` : '–'}</span>
          <span className="k">Party size paid</span><span>{b?.partySize ?? '–'}</span>
          <span className="k">Name</span><span>{b?.customerId ?? '–'}</span>
          <span className="k">Payment</span><span>{b?.fee?.fullTableFee !== undefined ? `${b.status === 'Confirmed' ? 'Paid in full · ' : ''}${fmtTHB(b.fee.fullTableFee)}` : '–'}</span>
        </div>
        <div className="hr" />
        <button type="button" className="primary wide" onClick={confirmEntry} disabled={action.busy || !valid}>Confirm entry</button>
        <div className="tiny" style={{ marginTop: 8 }}>A refused ticket shows the reason here instead: already checked in (with time and staff), unknown, another round, window not open yet, after the grace period.</div>
        <Link className="btn wide" to="/check-in" style={{ marginTop: 10 }}>Next scan</Link>
      </div>
    </div>
  );
}
