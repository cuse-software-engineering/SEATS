// Original file: proto/booking.proto


export interface Fee {
  'packagePrice'?: (number);
  'extraPersons'?: (number);
  'extraPersonFee'?: (number);
  'fullTableFee'?: (number);
}

export interface Fee__Output {
  'packagePrice': (number);
  'extraPersons': (number);
  'extraPersonFee': (number);
  'fullTableFee': (number);
}
