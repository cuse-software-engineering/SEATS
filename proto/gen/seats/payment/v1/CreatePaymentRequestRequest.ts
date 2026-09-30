// Original file: proto/payment.proto


export interface CreatePaymentRequestRequest {
  'bookingId'?: (string);
  'amount'?: (number);
  'customerId'?: (string);
}

export interface CreatePaymentRequestRequest__Output {
  'bookingId': (string);
  'amount': (number);
  'customerId': (string);
}
