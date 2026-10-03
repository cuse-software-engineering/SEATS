import { type FormEvent, useState } from 'react';
import { Button, Checkbox, type CustomerProfile, Field, TextInput } from '@seats/frontend-shared';
import { WhyWeAskCard } from './WhyWeAskCard';
import { hasErrors, type ProfileErrors, type ProfileValues, validateProfile } from './validation';

/** The consent (first booking only), the name and the mobile phone, each with its error under the field; Continue
 *  submits what is valid, Decline asks the parent to cancel the booking. The saved details prefill the fields. */
export function ProfileForm({ saved, busy, onSubmit, onDecline }: { saved: CustomerProfile | null; busy: boolean; onSubmit: (v: ProfileValues) => void; onDecline: () => void }) {
  const consentNeeded = saved === null;
  const [values, setValues] = useState<ProfileValues>({ name: saved?.name ?? '', phone: saved?.phone ?? '', consent: false });
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [checked, setChecked] = useState(false);   // after the first Continue every change is checked as it is typed

  const update = (patch: Partial<ProfileValues>) => {
    const next = { ...values, ...patch };
    setValues(next);
    if (checked) setErrors(validateProfile(next, consentNeeded));
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = validateProfile(values, consentNeeded);
    setChecked(true);
    setErrors(found);
    if (!hasErrors(found)) onSubmit(values);
  };

  return (
    <form onSubmit={submit} noValidate>
      <WhyWeAskCard saved={saved} />
      {consentNeeded && (
        <>
          <Checkbox label="I consent to the collection of my name and phone for these purposes" checked={values.consent} onChange={(e) => update({ consent: e.target.checked })} error={errors.consent} />
        </>
      )}
      <Field label="Name" error={errors.name}>
        {(id, invalid) => <TextInput id={id} invalid={invalid} value={values.name} onChange={(e) => update({ name: e.target.value })} autoComplete="name" />}
      </Field>
      <Field label="Mobile phone" error={errors.phone}>
        {(id, invalid) => <TextInput id={id} type="tel" invalid={invalid} value={values.phone} onChange={(e) => update({ phone: e.target.value })} inputMode="numeric" placeholder="08xxxxxxxx" autoComplete="tel" />}
      </Field>
      <Button type="submit" variant="primary" block busy={busy}>Continue</Button>
      <Button type="button" block onClick={onDecline} disabled={busy}>Decline and cancel the booking</Button>
      <div className="tiny" style={{ marginTop: 8 }}>Returning customer? Your saved details are shown here to confirm or correct.</div>
    </form>
  );
}
