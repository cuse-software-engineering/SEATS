// UC-07 Set Business Parameters (FR-38): the single settings document of the Round DB, answered with its defaults
// (BRULE-02, 04, 05, 09) until the Manager sets it; a round snapshots the values in force when it is published.
import { DomainError } from '@seats/errors/src/index.js';
import { ports } from './ports.js';
import type { BusinessParameters } from './model.js';

const DEFAULT_PARAMETERS: BusinessParameters = { holdPeriodMinutes: 15, checkInWindowHours: 2, gracePeriodMinutes: 30, extraPersonFee: 600 };   // BRULE-02, 04, 05, 09

export async function getBusinessParameters(): Promise<BusinessParameters> {
  return (await ports.businessParameters.get()) ?? (await ports.businessParameters.save({ ...DEFAULT_PARAMETERS }));
}

export async function updateBusinessParameters(patch: Partial<BusinessParameters>): Promise<BusinessParameters> {
  const p = { ...(await getBusinessParameters()) };
  for (const k of Object.keys(DEFAULT_PARAMETERS) as (keyof BusinessParameters)[]) {
    const v = patch[k];
    if (v === undefined) continue;
    if (!Number.isInteger(v) || v < 0) throw new DomainError('invalid', `${k} must be a non-negative whole number`);   // minutes, hours, THB: integers (data model)
    p[k] = v;
  }
  return ports.businessParameters.save(p);
}
