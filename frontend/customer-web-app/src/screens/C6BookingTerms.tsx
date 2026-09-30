import { useNavigate, useParams } from 'react-router-dom';
import { api, type Booking, type BookingTerms, ErrorAlert, fmtDateTime, fmtTHB, useAction, useLoad } from '@seats/frontend-shared';

/** C6 Booking terms (UC-01 steps 13–14): the terms with the check-in window; Accept then Pay, or Decline. */
export default function C6BookingTerms() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const terms = useLoad(() => api.get<BookingTerms>(`/api/bookings/${id}/terms`), [id]);
  const booking = useLoad(() => api.get<Booking>(`/api/bookings/${id}`), [id]);
  const action = useAction();
  const amount = booking.data?.fee?.fullTableFee;
  const w = terms.data?.checkInWindow;

  const accept = async () => {
    const accepted = await action.run(() => api.post<Booking>(`/api/bookings/${id}/terms-acceptance`));
    if (accepted) navigate(`/bookings/${id}/payment`);
  };
  const decline = async () => {
    const cancelled = await action.run(() => api.post<Booking>(`/api/bookings/${id}/cancel`));
    if (cancelled) navigate('/');
  };

  return (
    <>
      <h1>Booking terms</h1>
      <ErrorAlert error={terms.error} />
      <ErrorAlert error={booking.error} />
      <ErrorAlert error={action.error} onClose={action.clear} />
      <div className="card">
        {terms.data && (
          <ol data-testid="terms">{(terms.data.terms ?? []).map((t, i) => <li key={i}>{t}</li>)}</ol>
        )}
        {w && (
          <>
            <h4>Check-in window (BRULE-04, BRULE-05)</h4>
            <p className="small">Check-in opens {fmtDateTime(w.opensAt)}, the concert starts {fmtDateTime(w.startAt)}, the grace period ends {fmtDateTime(w.graceEndsAt)}.</p>
          </>
        )}
        {booking.data?.termsAccepted && <p className="small muted">You accepted these terms already.</p>}
        <div className="row">
          <button type="button" onClick={accept} disabled={action.busy || !terms.data}>Accept and pay {fmtTHB(amount)}</button>
          <button type="button" className="secondary" onClick={decline} disabled={action.busy}>Decline and cancel the booking</button>
        </div>
      </div>
    </>
  );
}
