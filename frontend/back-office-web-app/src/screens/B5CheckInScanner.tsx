import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Booking, ErrorAlert, toApiError, type UpcomingRound, useLoad, useSession, type VerificationResult } from '@seats/frontend-shared';

export interface ScanState { reference: string; roundId: string; result?: VerificationResult; error?: { status: number; error: string; details?: unknown } }

/** B5 Check-in scanner (UC-02 steps 1–2, AF-2): the round and the count of guests checked in, the camera viewfinder
 *  (a stub until the QR e-ticket of progress 2), the booking reference typed by hand; the answer opens B6. */
export default function B5CheckInScanner() {
  const navigate = useNavigate();
  const session = useSession();
  const rounds = useLoad(() => api.get<UpcomingRound[]>('/api/rounds'), []);
  const [roundId, setRoundId] = useState('');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const canCount = session?.role === 'manager' || session?.role === 'owner';   // GET /rounds/{id}/bookings is manager and owner only
  const bookings = useLoad<Booking[] | null>(() => (roundId && canCount ? api.get<Booking[]>(`/api/rounds/${roundId}/bookings`) : Promise.resolve(null)), [roundId, canCount]);
  const checkedIn = bookings.data?.filter((b) => b.status === 'Checked-in').length;

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const state: ScanState = { reference: reference.trim(), roundId };
    try {
      state.result = await api.post<VerificationResult>('/api/check-ins/verify', { bookingReference: state.reference });
    } catch (err) {
      const a = toApiError(err);
      state.error = { status: a.status, error: a.error, details: a.details };
    }
    setBusy(false);
    navigate('/check-in/result', { state });
  };

  return (
    <>
      <h1>Check-in</h1>
      <ErrorAlert error={rounds.error} />
      <ErrorAlert error={bookings.error} />
      <div className="card" style={{ maxWidth: 520 }}>
        <label className="field">Round
          <select value={roundId} onChange={(e) => setRoundId(e.target.value)}>
            <option value="">— choose —</option>
            {rounds.data?.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.date}</option>)}
          </select>
        </label>
        {roundId && canCount && <p className="small muted">Checked in so far: <strong>{checkedIn ?? '…'}</strong> of {bookings.data?.length ?? '…'} bookings.</p>}
        <div className="viewfinder">Camera viewfinder<br /><span className="small">The QR scanner comes with the e-ticket in progress 2; type the booking reference below.</span></div>
        <form onSubmit={verify}>
          <label className="field">Booking reference<input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. SEATS-2026-000123" autoFocus /></label>
          <button type="submit" disabled={busy || !reference.trim()}>Verify</button>
        </form>
      </div>
    </>
  );
}
