// Original file: proto/concert_round.proto

import type { TableNumbers as _seats_concertround_v1_TableNumbers, TableNumbers__Output as _seats_concertround_v1_TableNumbers__Output } from '../../../seats/concertround/v1/TableNumbers';
import type { PackagePrices as _seats_concertround_v1_PackagePrices, PackagePrices__Output as _seats_concertround_v1_PackagePrices__Output } from '../../../seats/concertround/v1/PackagePrices';

export interface UpdateRoundRequest {
  'roundId'?: (string);
  'name'?: (string);
  'artist'?: (string);
  'date'?: (string);
  'doorsOpenAt'?: (string);
  'startAt'?: (string);
  'bookingOpenAt'?: (string);
  'zoneMapId'?: (string);
  'tablesNotForSale'?: (_seats_concertround_v1_TableNumbers | null);
  'prices'?: (_seats_concertround_v1_PackagePrices | null);
  '_name'?: "name";
  '_artist'?: "artist";
  '_date'?: "date";
  '_doorsOpenAt'?: "doorsOpenAt";
  '_startAt'?: "startAt";
  '_bookingOpenAt'?: "bookingOpenAt";
  '_zoneMapId'?: "zoneMapId";
}

export interface UpdateRoundRequest__Output {
  'roundId': (string);
  'name'?: (string);
  'artist'?: (string);
  'date'?: (string);
  'doorsOpenAt'?: (string);
  'startAt'?: (string);
  'bookingOpenAt'?: (string);
  'zoneMapId'?: (string);
  'tablesNotForSale': (_seats_concertround_v1_TableNumbers__Output | null);
  'prices': (_seats_concertround_v1_PackagePrices__Output | null);
}
