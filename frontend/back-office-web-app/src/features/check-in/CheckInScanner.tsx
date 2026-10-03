import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Button, Divider, Field, fmtClock, LoadError, Select, TextInput, toApiError, toast, useMutate, useSession, type VerificationResult } from '@seats/frontend-shared';
import { roundWhenShort } from '../../app/format';
import { useRound, useRoundBookings, useUpcomingRounds } from '../../app/queries';
import { PhoneScreen } from '../../components/PhoneScreen';
import type { ScanState } from './scan-state';

/** The front staff's scanner: the round in the app bar, the guests checked in and the check-in window, the camera
 *  viewfinder (the camera scanner is not available yet) and "Cannot scan?" with the booking reference typed by
 *  hand; the answer of the verification opens the result screen. */
export function CheckInScanner() {
  const navigate = useNavigate();
  const session = useSession();
  const rounds = useUpcomingRounds();
  const [roundId, setRoundId] = useState('');
  const [choosing, setChoosing] = useState(false);
  const [typing, setTyping] = useState(false);
  const [reference, setReference] = useState('');
  const canCount = session?.role === 'manager' || session?.role === 'owner';
  const round = useRound(roundId || null);
  const bookings = useRoundBookings(roundId || null, canCount);
  const checkedIn = bookings.data?.filter((b) => b.status === 'Checked-in').length;
  const expected = bookings.data?.filter((b) => b.status === 'Confirmed' || b.status === 'Checked-in').length;

  // the verification; a 501 means check-in is not available yet, a known answer said in plain words rather than a failure
  const verify = useMutate(async (ref: string): Promise<{ result: VerificationResult } | { notAvailable: true }> => {
    try { return { result: await api.post<VerificationResult>('/api/check-ins/verify', { bookingReference: ref }) }; }
    catch (e) { const a = toApiError(e); if (a.status === 501) return { notAvailable: true }; throw a; }
  }, {
    failure: 'Could not verify the reference',
    onSuccess: (out, ref) => {
      if ('notAvailable' in out) {
        toast.error('Check-in is not available yet: the reference could not be verified');
        navigate('/check-in/result', { state: { reference: ref, roundId, error: { status: 501, error: 'check-in is not available yet' } } satisfies ScanState });
      } else navigate('/check-in/result', { state: { reference: ref, roundId, result: out.result } satisfies ScanState });
    },
    onError: (error, ref) => navigate('/check-in/result', { state: { reference: ref, roundId, error: { status: error.status, error: error.error } } satisfies ScanState }),
  });
  const submit = (e: FormEvent) => { e.preventDefault(); if (reference.trim()) verify.mutate(reference.trim()); };

  const r = round.data;
  const w = r?.checkInWindow;
  const now = Date.now();
  const windowText = !w ? 'Window: choose a round' : now < new Date(w.opensAt ?? 0).getTime() ? `Window opens at ${fmtClock(w.opensAt)}`
    : now > new Date(w.graceEndsAt ?? 0).getTime() ? `Window closed at ${fmtClock(w.graceEndsAt)}` : `Window open since ${fmtClock(w.opensAt)}`;

  return (
    <PhoneScreen title={`Check-in${r ? ` · ${roundWhenShort(r)}` : ''}`} right={r && !choosing ? <Button variant="link" size="sm" onClick={() => setChoosing(true)}>change</Button> : undefined} testId="scanner">
      {rounds.isError && <LoadError error={rounds.error} retry={() => void rounds.refetch()} what="load the rounds" />}
      {round.isError && <LoadError error={round.error} retry={() => void round.refetch()} what="load the round" />}
      {(!r || choosing) && (
        <Field label="Round" inline>
          {(id) => (
            <Select id={id} value={roundId} onChange={(e) => { setRoundId(e.target.value); setChoosing(false); }}>
              <option value="">— choose the round —</option>
              {rounds.data?.map((u) => <option key={u.id} value={u.id}>{roundWhenShort(u)} · {u.artist || u.name}</option>)}
            </Select>
          )}
        </Field>
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
      <div className="tiny center" style={{ marginTop: 4 }}>The camera scanner is not available yet: type the booking reference below.</div>
      <Divider />
      <div className="label">Cannot scan?</div>
      {!typing && <Button size="sm" block onClick={() => setTyping(true)}>Type the booking reference</Button>}
      {typing && (
        <form onSubmit={submit}>
          <Field label="Booking reference">{(id) => <TextInput id={id} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. SEATS-2026-000123" autoFocus />}</Field>
          <Button type="submit" variant="primary" block busy={verify.isPending} disabled={!reference.trim()}>Verify</Button>
        </form>
      )}
    </PhoneScreen>
  );
}
