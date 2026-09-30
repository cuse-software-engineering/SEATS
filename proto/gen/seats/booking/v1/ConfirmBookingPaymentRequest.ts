// Original file: proto/booking.proto


export interface ConfirmBookingPaymentRequest {
  'bookingId'?: (string);
  'paymentId'?: (string);
  'amount'?: (number);
}

export interface ConfirmBookingPaymentRequest__Output {
  'bookingId': (string);
  'paymentId': (string);
  'amount': (number);
}
