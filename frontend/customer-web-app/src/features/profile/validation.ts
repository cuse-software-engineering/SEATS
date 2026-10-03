// What the details form checks before it asks the gateway: a name, a Thai mobile number (10 digits starting with
// 06, 08 or 09, as openapi.yaml describes CustomerProfileCreate) and, on the first booking, the consent (BRULE-11).
const PHONE = /^0[689]\d{8}$/;

export interface ProfileValues { name: string; phone: string; consent: boolean }
export interface ProfileErrors { name?: string; phone?: string; consent?: string }

/** The phone as the gateway wants it: digits only. */
export const digitsOf = (phone: string): string => phone.replace(/[\s-]/g, '');

export function validateProfile(v: ProfileValues, consentNeeded: boolean): ProfileErrors {
  const errors: ProfileErrors = {};
  if (!v.name.trim()) errors.name = 'Name is required.';
  if (!PHONE.test(digitsOf(v.phone))) errors.phone = 'Enter a 10-digit Thai mobile number.';
  if (consentNeeded && !v.consent) errors.consent = 'Tick the box to let us keep your name and phone for this booking.';
  return errors;
}

export const hasErrors = (e: ProfileErrors): boolean => Object.keys(e).length > 0;
