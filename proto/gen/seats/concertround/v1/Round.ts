// Original file: proto/concert_round.proto

import type { PackagePrice as _seats_concertround_v1_PackagePrice, PackagePrice__Output as _seats_concertround_v1_PackagePrice__Output } from '../../../seats/concertround/v1/PackagePrice';
import type { CheckInWindow as _seats_concertround_v1_CheckInWindow, CheckInWindow__Output as _seats_concertround_v1_CheckInWindow__Output } from '../../../seats/concertround/v1/CheckInWindow';
import type { BusinessParameters as _seats_concertround_v1_BusinessParameters, BusinessParameters__Output as _seats_concertround_v1_BusinessParameters__Output } from '../../../seats/concertround/v1/BusinessParameters';
import type { RoundTable as _seats_concertround_v1_RoundTable, RoundTable__Output as _seats_concertround_v1_RoundTable__Output } from '../../../seats/concertround/v1/RoundTable';

export interface Round {
  'id'?: (string);
  'name'?: (string);
  'artist'?: (string);
  'status'?: (string);
  'date'?: (string);
  'doorsOpenAt'?: (string);
  'startAt'?: (string);
  'bookingOpenAt'?: (string);
  'zoneMapId'?: (string);
  'tablesNotForSale'?: (number)[];
  'prices'?: (_seats_concertround_v1_PackagePrice)[];
  'checkInWindow'?: (_seats_concertround_v1_CheckInWindow | null);
  'parameters'?: (_seats_concertround_v1_BusinessParameters | null);
  'createdAt'?: (string);
  'holdPeriodMinutes'?: (number);
  'tables'?: (_seats_concertround_v1_RoundTable)[];
  'confirmedBookings'?: (number);
  '_confirmedBookings'?: "confirmedBookings";
}

export interface Round__Output {
  'id': (string);
  'name': (string);
  'artist': (string);
  'status': (string);
  'date': (string);
  'doorsOpenAt': (string);
  'startAt': (string);
  'bookingOpenAt': (string);
  'zoneMapId': (string);
  'tablesNotForSale': (number)[];
  'prices': (_seats_concertround_v1_PackagePrice__Output)[];
  'checkInWindow': (_seats_concertround_v1_CheckInWindow__Output | null);
  'parameters': (_seats_concertround_v1_BusinessParameters__Output | null);
  'createdAt': (string);
  'holdPeriodMinutes': (number);
  'tables': (_seats_concertround_v1_RoundTable__Output)[];
  'confirmedBookings'?: (number);
}
