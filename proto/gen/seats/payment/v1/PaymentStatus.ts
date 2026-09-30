// Original file: proto/payment.proto


export interface PaymentStatus {
  'paymentId'?: (string);
  'bookingId'?: (string);
  'status'?: (string);
  'amount'?: (number);
}

export interface PaymentStatus__Output {
  'paymentId': (string);
  'bookingId': (string);
  'status': (string);
  'amount': (number);
}
