import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Booking, type CustomerProfile, ErrorAlert, mmss, toApiError, useAction, useLoad } from '@seats/frontend-shared';
import { Screen } from '../Screen';
import { fmtDayClock } from '../format';
import { useHeldBooking } from '../hooks';

const PHONE = /^0[689]\d{8}$/;   // Thai mobile number: 10 digits starting with 06, 08 or 09 (openapi.yaml, CustomerProfileCreate)
type Problem = { field: 'name' | 'phone' | 'consent'; text: string };

/** C5 Customer profile and consent (UC-01 step 12, AF-5; UC-09): on the first booking why the data is asked for,
 *  the consent, the name and the mobile phone with validation; later the stored details to confirm or correct.
 *  Decline cancels the booking (UC-01 AF-5). */
export default function C5CustomerProfileAndConsent() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { remaining, held } = useHeldBooking(id);
  const profile = useLoad<CustomerProfile | null>(async () => {
    try { return await api.get<CustomerProfile>('/api/customers/me'); }
    catch (e) { if (toApiError(e).status === 404) return null; throw e; }   // 404 before the first booking
  }, []);
  const action = useAction();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  useEffect(() => { if (profile.data) { setName(profile.data.name ?? ''); setPhone(profile.data.phone ?? ''); } }, [profile.data]);

  const isNew = !profile.loading && profile.data === null && !profile.error;
  const check = (): boolean => {
    if (!name.trim()) { setProblem({ field: 'name', text: 'Name is required.' }); return false; }
    if (!PHONE.test(phone.replace(/[\s-]/g, ''))) { setProblem({ field: 'phone', text: 'Enter a 10-digit Thai mobile number.' }); return false; }
    if (isNew && !consent) { setProblem({ field: 'consent', text: 'Consent is needed to keep your name and phone (BRULE-11).' }); return false; }
    setProblem(null);
    return true;
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!check()) return;
    const digits = phone.replace(/[\s-]/g, '');
    const changed = profile.data && (profile.data.name !== name.trim() || profile.data.phone !== digits);
    const saved = isNew
      ? await action.run(() => api.post<CustomerProfile>('/api/customers/me', { name: name.trim(), phone: digits, consent }))
      : changed ? await action.run(() => api.put<CustomerProfile>('/api/customers/me', { name: name.trim(), phone: digits })) : profile.data;
    if (saved) navigate(`/bookings/${id}/terms`);
  };
  const decline = async () => {
    const cancelled = await action.run(() => api.post<Booking>(`/api/bookings/${id}/cancel`));
    if (cancelled) navigate('/');
  };
  const Problem = ({ field }: { field: Problem['field'] }) => (problem?.field === field ? <div className="errtext" data-testid="profile-problem">{problem.text}</div> : null);

  return (
    <Screen title="Your details" back={`/bookings/${id}`} right={held ? <span data-testid="countdown">{mmss(remaining ?? 0)}</span> : undefined}>
      <ErrorAlert error={profile.error} />
      <ErrorAlert error={action.error} onClose={action.clear} />
      <form onSubmit={submit} noValidate>
        {isNew && (
          <div className="card soft">
            <h2>Why we ask</h2>
            <div className="muted">Your name and phone are used for this booking, its payment, check-in and contact about it only. They are collected once and pre-filled on your next booking.</div>
          </div>
        )}
        {profile.data && (
          <div className="card soft">
            <h2>Your saved details</h2>
            <div className="muted">Stored on your first booking, consent given {fmtDayClock(profile.data.consentAt)}. Confirm or correct them below.</div>
          </div>
        )}
        {isNew && (
          <label className="check-line"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />I consent to the collection of my name and phone for these purposes</label>
        )}
        <Problem field="consent" />
        <label className="label" htmlFor="profile-name">Name</label>
        <input id="profile-name" className={problem?.field === 'name' ? 'err' : undefined} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <Problem field="name" />
        <label className="label" htmlFor="profile-phone">Mobile phone</label>
        <input id="profile-phone" type="tel" className={problem?.field === 'phone' ? 'err' : undefined} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder="08xxxxxxxx" autoComplete="tel" />
        <Problem field="phone" />
        <button type="submit" className="btn primary" disabled={action.busy || profile.loading}>Continue</button>
        <button type="button" className="btn secondary" onClick={decline} disabled={action.busy}>Decline and cancel the booking</button>
        <div className="tiny" style={{ marginTop: 8 }}>Returning customer? Your saved details are shown here to confirm or correct.</div>
      </form>
    </Screen>
  );
}
