// Original file: proto/table_availability.proto


export interface TableStatus {
  'tableNumber'?: (number);
  'status'?: (string);
  'bookingId'?: (string);
  'holdEndsAt'?: (string);
}

export interface TableStatus__Output {
  'tableNumber': (number);
  'status': (string);
  'bookingId': (string);
  'holdEndsAt': (string);
}
