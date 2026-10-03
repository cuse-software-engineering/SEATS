// Where a signed-in account lands: the front staff on the check-in scanner, the manager and the owner on the rounds.
import type { Role } from '@seats/frontend-shared';

export const landingOf = (role: Role): string => (role === 'front_staff' ? '/check-in' : '/rounds');
