// Data model of the Booking DB (docs/data-model.md): bookings and customer profiles.
export type BookingStatus = 'Held' | 'Confirmed' | 'Checked-in' | 'Cancelled' | 'Expired' | 'No-show';

export interface Fee {
  packagePrice: number;     // BRULE-08
  extraPersons: number;
  extraPersonFee: number;   // BRULE-09
  fullTableFee: number;     // BRULE-01
}

export interface Booking {
  id: string;
  customerId: string;       // LINE user id (BRULE-12)
  roundId: string;          // reference to the Round DB
  tableNumber: number;      // reference to the Table Status DB
  zoneId: string;           // copied from the round at hold time (BRULE-07)
  zoneName: string;
  tableTypeId: string;
  capacity: number;
  status: BookingStatus;
  holdEndsAt: string;       // BRULE-02; the expiry job owns it (ADR-08)
  partySize: number | null;
  fee: Fee | null;
  termsAccepted: boolean;   // BRULE-16
  createdAt: string;
}

export interface CustomerProfile {
  customerId: string;
  name: string;
  phone: string;            // Thai mobile number
  consentAt: string;        // PDPA consent (FR-10, BRULE-11)
}

/** A booking as the Customer sees it. */
export type BookingView = Booking & { remainingHoldSeconds: number };
