// Original file: proto/concert_round.proto


export interface UpcomingRound {
  'id'?: (string);
  'name'?: (string);
  'artist'?: (string);
  'date'?: (string);
  'startAt'?: (string);
  'bookingOpenAt'?: (string);
  'status'?: (string);
  'availableTables'?: (number);
  'tablesForSale'?: (number);
}

export interface UpcomingRound__Output {
  'id': (string);
  'name': (string);
  'artist': (string);
  'date': (string);
  'startAt': (string);
  'bookingOpenAt': (string);
  'status': (string);
  'availableTables': (number);
  'tablesForSale': (number);
}
