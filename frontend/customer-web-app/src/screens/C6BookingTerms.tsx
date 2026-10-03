import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Booking, type BookingTerms, ErrorAlert, mmss, useAction, useLoad } from '@seats/frontend-shared';
import { Screen } from '../Screen';
import { thb } from '../format';
import { useHeldBooking } from '../hooks';

/** "Full payment confirms the booking; there is no deposit…" → the bold lead clause and the rest, as the wireframe
 *  prints a term: up to the first ".", ";" or ":" followed by a space, else up to a parenthesis, else all bold. */
function splitTerm(text: string): [string, string] {
  const clause = /^(.*?[.;:])\s+(.*)$/s.exec(text);
  if (clause) return [clause[1], clause[2]];
  const paren = /^(.*?)\s+(\(.*)$/s.exec(text);
  if (paren) return [paren[1], paren[2]];
  return [text, ''];
}

/** C6 Booking terms (UC-01 steps 13–14): the terms with the check-in window, the acceptance box, Pay with the full
 *  table fee (POST terms-acceptance, then C7), or Decline and cancel. */
export default function C6BookingTerms() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { booking, remaining, held } = useHeldBooking(id);
  const terms = useLoad(() => api.get<BookingTerms>(`/api/bookings/${id}/terms`), [id]);
  const action = useAction();
  const [accepted, setAccepted] = useState(false);
  useEffect(() => { if (booking.data?.termsAccepted) setAccepted(true); }, [booking.data?.termsAccepted]);
  const amount = booking.data?.fee?.fullTableFee;

  const pay = async () => {
    const ok = await action.run(() => api.post<Booking>(`/api/bookings/${id}/terms-acceptance`));
    if (ok) navigate(`/bookings/${id}/payment`);
  };
  const decline = async () => {
    const cancelled = await action.run(() => api.post<Booking>(`/api/bookings/${id}/cancel`));
    if (cancelled) navigate('/');
  };

  return (
    <Screen title="Booking terms" back={`/bookings/${id}/profile`} right={held ? <span data-testid="countdown">{mmss(remaining ?? 0)}</span> : undefined}>
      <ErrorAlert error={terms.error} />
      <ErrorAlert error={booking.error} />
      <ErrorAlert error={action.error} onClose={action.clear} />
      <div className="card">
        {terms.loading && !terms.data && <p className="muted">Loading the terms…</p>}
        {terms.data && (
          <ol data-testid="terms" style={{ margin: 0, paddingLeft: 20 }}>
            {(terms.data.terms ?? []).map((t, i) => {
              const [lead, rest] = splitTerm(t);
              return <li key={i} style={i ? { marginTop: 6 } : undefined}><b>{lead}</b>{rest ? ` ${rest}` : ''}</li>;
            })}
          </ol>
        )}
      </div>
      <label className="check-line"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />I have read and accept the booking terms</label>
      <button type="button" className="btn primary" onClick={pay} disabled={!accepted || action.busy || !terms.data || amount === undefined}>Pay {thb(amount)}</button>
      <button type="button" className="btn secondary narrow" onClick={decline} disabled={action.busy}>Decline the terms and cancel the booking</button>
      <div className="tiny" style={{ marginTop: 8 }}>The terms are sent again with your e-ticket.</div>
    </Screen>
  );
}
