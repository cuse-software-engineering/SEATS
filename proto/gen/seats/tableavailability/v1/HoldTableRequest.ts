// Original file: proto/table_availability.proto


export interface HoldTableRequest {
  'roundId'?: (string);
  'tableNumber'?: (number);
  'bookingId'?: (string);
  'holdEndsAt'?: (string);
}

export interface HoldTableRequest__Output {
  'roundId': (string);
  'tableNumber': (number);
  'bookingId': (string);
  'holdEndsAt': (string);
}
