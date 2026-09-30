// Data model of the Notification DB (docs/data-model.md): one record per message pushed to a customer.
export type NotificationKind = 'BookingConfirmation' | 'HoldExpiredNotice' | 'PaymentFailedNotice';

export interface Message {
  messageId: string;
  customerId: string;       // LINE user id (BRULE-12)
  bookingId: string;        // reference to the Booking DB
  kind: NotificationKind;
  text: string;             // what the LINE Messaging Adapter would push
  delivered: boolean;
  sentAt: string;
}
