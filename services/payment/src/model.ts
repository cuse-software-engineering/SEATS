// Data model of the Payment DB (docs/data-model.md): one payment per request of the Booking Service.
export type PaymentStatusValue = 'Pending' | 'Paid' | 'Failed';

export interface Payment {
  paymentId: string;
  bookingId: string;        // reference to the Booking DB
  customerId: string;       // LINE user id (BRULE-12)
  amount: number;           // THB, the full table fee (BRULE-01)
  status: PaymentStatusValue;
  checkoutUrl: string;      // of the (simulated) Payment Gateway (ADR-11)
  createdAt: string;
  resultAt: string;         // '' until the gateway's result arrives
}
