import { Stepper } from '@seats/frontend-shared';
import { extraPersons, thb } from '../../app/format';

/** − N + with, at the right, the table's capacity and the extra persons it costs (BRULE-09). */
export function PartySizePicker({ value, capacity, extra, extraFee, disabled, onChange }: { value: number; capacity: number | undefined; extra: number; extraFee: number | undefined; disabled: boolean; onChange: (v: number) => void }) {
  return (
    <>
      <div className="label">Party size</div>
      <div className="row" style={{ marginTop: 4 }}>
        <Stepper value={value} min={1} onChange={onChange} disabled={disabled} testId="party-size" />
        <span className="tiny right-text">
          <div>Capacity {capacity ?? '–'}</div>
          <div>{extra > 0 ? `${extraPersons(extra)} × ${thb(extraFee)}` : 'no extra person'}</div>
        </span>
      </div>
    </>
  );
}
