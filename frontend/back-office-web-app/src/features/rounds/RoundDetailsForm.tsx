import { Card, Field, fmtClock, type Round, TextInput } from '@seats/frontend-shared';
import { plural } from '../../app/format';
import type { FormErrors, RoundForm } from './editor-state';

const hours = (from: string | undefined, to: string | undefined): number => Math.round(((new Date(to ?? 0).getTime() - new Date(from ?? 0).getTime()) / 3600e3) * 10) / 10;
const minutes = (from: string | undefined, to: string | undefined): number => Math.round((new Date(to ?? 0).getTime() - new Date(from ?? 0).getTime()) / 60e3);

/** "Concert details": name, artist, date, doors open, start, booking opens; under them the check-in window the
 *  business parameters derive from the start, and what a published round keeps. */
export function RoundDetailsForm({ form, errors, round, onChange, disabled, locked }: {
  form: RoundForm; errors: FormErrors; round: Round; onChange: (patch: Partial<RoundForm>) => void; disabled: boolean; locked: boolean;
}) {
  const text = (key: 'name' | 'artist' | 'date' | 'doorsOpenAt' | 'startAt' | 'bookingOpenAt') => ({ value: form[key], onChange: (e: { target: { value: string } }) => onChange({ [key]: e.target.value }) });
  const w = round.checkInWindow;
  const p = round.parameters;
  const published = round.status === 'Published';
  return (
    <Card title="Concert details">
      <Field label="Name" inline>{(id) => <TextInput id={id} {...text('name')} disabled={disabled} />}</Field>
      <Field label="Artist" inline>{(id) => <TextInput id={id} {...text('artist')} disabled={disabled} placeholder="who plays" />}</Field>
      <Field label="Date" inline>{(id) => <TextInput id={id} type="date" {...text('date')} disabled={disabled} />}</Field>
      <Field label="Doors open" inline error={errors.doorsOpenAt}>{(id, invalid) => <TextInput id={id} type="datetime-local" invalid={invalid} {...text('doorsOpenAt')} disabled={disabled} />}</Field>
      <Field label="Start" inline>{(id) => <TextInput id={id} type="datetime-local" {...text('startAt')} disabled={disabled} />}</Field>
      <Field label="Booking opens" inline error={errors.bookingOpenAt} hint={locked ? 'Fixed: booking has opened' : undefined}>
        {(id, invalid) => <TextInput id={id} type="datetime-local" invalid={invalid} {...text('bookingOpenAt')} disabled={disabled || locked} />}
      </Field>
      {w
        ? <div className="tiny" style={{ marginTop: 6 }}>Check-in window <b>{fmtClock(w.opensAt)}–{fmtClock(w.graceEndsAt)}</b>: from {hours(w.opensAt, w.startAt)} h before the start until {minutes(w.startAt, w.graceEndsAt)} min after it (business parameters).</div>
        : <div className="tiny" style={{ marginTop: 6 }}>The check-in window follows from the start time and the business parameters once the draft is saved.</div>}
      {published && (
        <div className="tiny" style={{ marginTop: 4 }}>
          A published round keeps its zone map, its prices and its tables not for sale once booking has opened; with a booked table it keeps its date and times too.
          {round.confirmedBookings !== undefined && round.confirmedBookings > 0 && <> {plural(round.confirmedBookings, 'confirmed booking')} keep their table.</>}
        </div>
      )}
      {p && <div className="tiny" style={{ marginTop: 4 }}>Published with: hold {p.holdPeriodMinutes} min · check-in window {p.checkInWindowHours} h · grace {p.gracePeriodMinutes} min · extra person {p.extraPersonFee} THB.</div>}
    </Card>
  );
}
