// Original file: proto/notification.proto


export interface NotificationRequest {
  'customerId'?: (string);
  'bookingId'?: (string);
  'roundName'?: (string);
  'tableNumber'?: (number);
}

export interface NotificationRequest__Output {
  'customerId': (string);
  'bookingId': (string);
  'roundName': (string);
  'tableNumber': (number);
}
