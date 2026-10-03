// Data model of the Staff Account DB (docs/data-model.md): staff accounts and their sessions.
export type StaffRole = 'manager' | 'front_staff' | 'owner';   // Table 5.2
export type StaffAccountStatus = 'Active' | 'Disabled';

export interface StaffAccount {
  staffAccountId: string;
  username: string;         // unique
  role: StaffRole;
  status: StaffAccountStatus;
  passwordSalt: string;
  passwordHash: string;     // scrypt of the password with the salt
  createdAt: string;
}

/** A signed-in staff member; the token travels as the bearer token of the back-office (ADR-07). */
export interface Session {
  token: string;
  staffAccountId: string;
  role: StaffRole;
  createdAt: string;
}

/** What callers see: the account without its password. */
export interface StaffAccountView { staffAccountId: string; username: string; role: StaffRole; status: StaffAccountStatus }
