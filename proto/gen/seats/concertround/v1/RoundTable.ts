// Original file: proto/concert_round.proto


export interface RoundTable {
  'tableNumber'?: (number);
  'zoneId'?: (string);
  'zoneName'?: (string);
  'tableTypeId'?: (string);
  'capacity'?: (number);
  'forSale'?: (boolean);
  'tableTypeName'?: (string);
  'x'?: (number);
  'y'?: (number);
  'packagePrice'?: (number);
  'packageContent'?: (string);
  '_packagePrice'?: "packagePrice";
}

export interface RoundTable__Output {
  'tableNumber': (number);
  'zoneId': (string);
  'zoneName': (string);
  'tableTypeId': (string);
  'capacity': (number);
  'forSale': (boolean);
  'tableTypeName': (string);
  'x': (number);
  'y': (number);
  'packagePrice'?: (number);
  'packageContent': (string);
}
