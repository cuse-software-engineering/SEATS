import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Booking, ErrorAlert, fmtTime, type Round, toApiError, type UpcomingRound, useLoad, useSession, type VerificationResult } from '@seats/frontend-shared';
import { fmtWhen } from '../parts';

export interface ScanState { reference: string; roundId: string; result?: VerificationResult; error?: { status: number; error: string; details?: unknown } }

/** B5 Check-in scanner (UC-02 steps 1–2, AF-2; Table D.14): the front staff's phone screen. The app bar names the
 *  round; under it the count of guests checked in and the check-in window, the camera viewfinder (a stub until the
 *  QR e-ticket of progress 2), and "Cannot scan?" with the booking reference typed by hand; the answer of
 *  POST /api/check-ins/verify opens B6. */
export default function B5CheckInScanner() {
  const navigate = useNavigate();
  const session = useSession();
  const rounds = useLoad(() => api.get<UpcomingRound[]>('/api/rounds'), []);
  const [roundId, setRoundId] = useState('');
  const [choosing, setChoosing] = useState(false);
  const [typing, setTyping] = useState(false);
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const canCount = session?.role === 'manager' || session?.role === 'owner';   // GET /rounds/{id}/bookings is manager and owner only
  const round = useLoad<Round | null>(() => (roundId ? api.get<Round>(`/api/rounds/${roundId}`) : Promise.resolve(null)), [roundId]);
  const bookings = useLoad<Booking[] | null>(() => (roundId && canCount ? api.get<Booking[]>(`/api/rounds/${roundId}/bookings`) : Promise.resolve(null)), [roundId, canCount]);
  const checkedIn = bookings.data?.filter((b) => b.status === 'Checked-in').length;
  const expected = bookings.data?.filter((b) => b.status === 'Confirmed' || b.status === 'Checked-in').length;

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

  const r = round.data;
  const w = r?.checkInWindow;
  const now = Date.now();
  const windowText = !w ? 'Window: choose a round' : now < new Date(w.opensAt ?? 0).getTime() ? `Window opens at ${fmtTime(w.opensAt)}`
    : now > new Date(w.graceEndsAt ?? 0).getTime() ? `Window closed at ${fmtTime(w.graceEndsAt)}` : `Window open since ${fmtTime(w.opensAt)}`;
  return (
    <div className="phone-screen" data-testid="b5">
      <div className="appbar">
        <span>Check-in{r ? ` · ${fmtWhen(r.date, r.startAt, false)}` : ''}</span>
        {r && !choosing && <button type="button" className="link right" onClick={() => setChoosing(true)}>change</button>}
      </div>
      <div className="content">
        <ErrorAlert error={rounds.error} />
        <ErrorAlert error={round.error} />
        <ErrorAlert error={bookings.error} />
        {(!r || choosing) && (
          <div className="frow" style={{ margin: '2px 0 6px' }}>
            <label className="fl" htmlFor="ci-round">Round</label>
            <select id="ci-round" value={roundId} onChange={(e) => { setRoundId(e.target.value); setChoosing(false); }}>
              <option value="">— choose the round —</option>
              {rounds.data?.map((u) => <option key={u.id} value={u.id}>{fmtWhen(u.date, u.startAt, false)} · {u.artist || u.name}</option>)}
            </select>
          </div>
        )}
        <div className="row">
          <span className="b">Checked in {canCount && roundId ? `${checkedIn ?? '…'} / ${expected ?? '…'}` : '–'}</span>
          <span className="tiny">{windowText}</span>
        </div>
        <div className="viewfinder" aria-hidden="true">
          <div className="frame" />
          <div className="hint">Point the camera at the e-ticket QR code</div>
        </div>
        <div className="muted center">The customer shows the e-ticket on the phone</div>
        <div className="tiny center" style={{ marginTop: 4 }}>The QR scanner comes with the e-ticket in progress 2.</div>
        <div className="hr" />
        <div className="label">Cannot scan?</div>
        {!typing && <button type="button" className="small wide" onClick={() => setTyping(true)} style={{ marginTop: 8 }}>Type the booking reference</button>}
        {typing && (
          <form onSubmit={verify}>
            <label className="label" htmlFor="ci-reference">Booking reference</label>
            <input id="ci-reference" className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. SEATS-2026-000123" autoFocus />
            <button type="submit" className="primary wide" disabled={busy || !reference.trim()} style={{ marginTop: 0 }}>Verify</button>
          </form>
        )}
      </div>
    </div>
  );
}
