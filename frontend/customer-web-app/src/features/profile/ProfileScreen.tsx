import { useNavigate, useParams } from 'react-router-dom';
import { api, type CustomerProfile, LoadError, Loading, useMutate } from '@seats/frontend-shared';
import { paths } from '../../app/paths';
import { Screen } from '../../app/Screen';
import { HoldCountdown } from '../booking/HoldCountdown';
import { HoldStateNotice } from '../booking/HoldStateNotice';
import { useBooking } from '../booking/useBooking';
import { useCancelBooking } from '../booking/useCancelBooking';
import { ProfileForm } from './ProfileForm';
import { useProfile } from './useProfile';
import { digitsOf, type ProfileValues } from './validation';

/** The customer's details (UC-01 step 12, AF-5; UC-09): on the first booking the consent, the name and the mobile
 *  phone; later the stored details to confirm or correct. Decline cancels the booking. */
export function ProfileScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { booking, remaining, held } = useBooking(id);
  const { query, profile, missing, loading, error } = useProfile();

  const save = useMutate<ProfileValues, CustomerProfile>(
    (v) => (missing
      ? api.post<CustomerProfile>('/api/customers/me', { name: v.name.trim(), phone: digitsOf(v.phone), consent: v.consent })
      : api.put<CustomerProfile>('/api/customers/me', { name: v.name.trim(), phone: digitsOf(v.phone) })),
    { success: () => (missing ? 'Details saved' : 'Details updated'), failure: 'Could not save your details', invalidate: [['profile']], onSuccess: () => navigate(paths.terms(id)) },
  );
  const submit = (v: ProfileValues) => {
    const unchanged = profile && profile.name === v.name.trim() && profile.phone === digitsOf(v.phone);
    if (unchanged) navigate(paths.terms(id));
    else save.mutate(v);
  };
  const { ask, busy: cancelling } = useCancelBooking(id, { what: 'booking', onCancelled: () => navigate(paths.rounds) });
  const decline = () => ask({ title: 'Decline and cancel the booking?', message: 'Nothing about you is stored and the table is released.', confirmLabel: 'Decline and cancel', cancelLabel: 'Go back' });

  return (
    <Screen title="Your details" back={paths.booking(id)} right={<HoldCountdown remaining={remaining} held={held} />}>
      {booking && <HoldStateNotice booking={booking} held={held} />}
      {loading && !missing && <Loading what="Loading your details" />}
      {error && <LoadError error={error} retry={() => void query.refetch()} what="load your details" />}
      {!loading && !error && <ProfileForm saved={profile} busy={save.isPending || cancelling} onSubmit={submit} onDecline={decline} />}
    </Screen>
  );
}
