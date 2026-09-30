import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Booking, type CustomerProfile, ErrorAlert, fmtDateTime, toApiError, useAction, useLoad } from '@seats/frontend-shared';

const PHONE = /^0[689]\d{8}$/;   // Thai mobile number: 10 digits starting with 06, 08 or 09 (openapi.yaml, CustomerProfileCreate)

/** C5 Customer profile and consent (UC-01 step 12, AF-5; UC-09): on the first booking the purpose of the data
 *  collection, consent, name and phone; later the stored profile to confirm or correct. Decline cancels the booking. */
export default function C5CustomerProfileAndConsent() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const profile = useLoad<CustomerProfile | null>(async () => {
    try { return await api.get<CustomerProfile>('/api/customers/me'); }
    catch (e) { if (toApiError(e).status === 404) return null; throw e; }   // 404 before the first booking
  }, []);
  const action = useAction();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => { if (profile.data) { setName(profile.data.name ?? ''); setPhone(profile.data.phone ?? ''); } }, [profile.data]);

  const isNew = !profile.loading && profile.data === null && !profile.error;
  const check = (): boolean => {
    if (!name.trim()) { setProblem('Name is required.'); return false; }
    if (!PHONE.test(phone)) { setProblem('Phone must be 10 digits starting with 06, 08 or 09.'); return false; }
    if (isNew && !consent) { setProblem('Consent is needed to keep your name and phone (BRULE-11).'); return false; }
    setProblem(null);
    return true;
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!check()) return;
    const changed = profile.data && (profile.data.name !== name.trim() || profile.data.phone !== phone);
    const saved = isNew
      ? await action.run(() => api.post<CustomerProfile>('/api/customers/me', { name: name.trim(), phone, consent }))
      : changed ? await action.run(() => api.put<CustomerProfile>('/api/customers/me', { name: name.trim(), phone })) : profile.data;
    if (saved) navigate(`/bookings/${id}/terms`);
  };
  const decline = async () => {
    const cancelled = await action.run(() => api.post<Booking>(`/api/bookings/${id}/cancel`));
    if (cancelled) navigate('/');
  };

  return (
    <>
      <h1>Your details</h1>
      <ErrorAlert error={profile.error} />
      <ErrorAlert error={action.error} onClose={action.clear} />
      <form className="card" onSubmit={submit}>
        {isNew && (
          <>
            <h4>Why we ask (UC-09)</h4>
            <p className="small">Your name and phone number are kept with the booking so that the venue can reach you about it and can check you in. They are used for nothing else (FR-10, PDPA).</p>
          </>
        )}
        {profile.data && <p className="small muted">Stored on your first booking, consent given {fmtDateTime(profile.data.consentAt)}. Confirm or correct.</p>}
        <label className="field">Name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
        <label className="field">Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder="08xxxxxxxx" autoComplete="tel" /></label>
        {isNew && (
          <label className="check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>I consent to the collection of my name and phone number for this booking.</span></label>
        )}
        {problem && <div className="alert" role="alert" data-testid="profile-problem">{problem}</div>}
        <div className="row">
          <button type="submit" disabled={action.busy || profile.loading}>{profile.data ? 'Confirm and continue' : 'Continue'}</button>
          <button type="button" className="secondary" onClick={decline} disabled={action.busy}>Decline and cancel the booking</button>
        </div>
      </form>
    </>
  );
}
