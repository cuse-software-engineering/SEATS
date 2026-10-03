// UC-09 Customer profile (FR-10, BRULE-11): the name, the Thai mobile number and the PDPA consent of a LINE user, asked
// for by UC-01 before the terms (steps 3–7, AF-1, AF-2).
import { DomainError } from '@seats/errors/src/index.js';
import { ports } from './ports.js';
import { iso } from './shared.js';
import type { CustomerProfile } from './model.js';

export async function getCustomerProfile(customerId: string): Promise<CustomerProfile> {
  const p = await ports.profiles.get(customerId);
  if (!p) throw new DomainError('not_found', 'no profile yet: this is the first booking');
  return p;
}

const validProfile = ({ name, phone }: { name?: string; phone?: string }): string[] => {
  const problems: string[] = [];
  if (!name?.trim()) problems.push('name is required');
  if (!/^0[689]\d{8}$/.test(phone ?? '')) problems.push('phone must be a Thai mobile number (10 digits starting with 06, 08 or 09)');   // AF-7
  return problems;
};

export async function createCustomerProfile(customerId: string, { name, phone, consent }: { name?: string; phone?: string; consent?: boolean }): Promise<CustomerProfile> {   // UC-09 steps 3–5, AF-1, AF-2
  if (await ports.profiles.get(customerId)) throw new DomainError('conflict', 'the profile exists: use updateCustomerProfile()');
  if (consent !== true) throw new DomainError('invalid', 'the booking cannot continue without consent to the data collection');   // UC-09 AF-1; UC-01 AF-5 then cancels
  const problems = validProfile({ name, phone });
  if (problems.length) throw new DomainError('invalid', 'invalid profile', problems);
  return ports.profiles.save({ customerId, name: (name as string).trim(), phone: phone as string, consentAt: iso(Date.now()) });
}

export async function updateCustomerProfile(customerId: string, { name, phone }: { name?: string; phone?: string }): Promise<CustomerProfile> {   // UC-09 steps 6–7
  const p = await getCustomerProfile(customerId);
  const next: CustomerProfile = { ...p, name: name ?? p.name, phone: phone ?? p.phone };
  const problems = validProfile(next);
  if (problems.length) throw new DomainError('invalid', 'invalid profile', problems);
  return ports.profiles.save(next);
}
