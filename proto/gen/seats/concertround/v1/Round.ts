// Original file: proto/concert_round.proto

import type { RoundTable as _seats_concertround_v1_RoundTable, RoundTable__Output as _seats_concertround_v1_RoundTable__Output } from '../../../seats/concertround/v1/RoundTable';

export interface Round {
  'roundId'?: (string);
  'name'?: (string);
  'artist'?: (string);
  'status'?: (string);
  'date'?: (string);
  'doorsOpenAt'?: (string);
  'startAt'?: (string);
  'bookingOpenAt'?: (string);
  'zoneMapId'?: (string);
  'holdPeriodMinutes'?: (number);
  'tables'?: (_seats_concertround_v1_RoundTable)[];
}

export interface Round__Output {
  'roundId': (string);
  'name': (string);
  'artist': (string);
  'status': (string);
  'date': (string);
  'doorsOpenAt': (string);
  'startAt': (string);
  'bookingOpenAt': (string);
  'zoneMapId': (string);
  'holdPeriodMinutes': (number);
  'tables': (_seats_concertround_v1_RoundTable__Output)[];
}
