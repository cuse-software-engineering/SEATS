// Original file: proto/concert_round.proto

import type { PackagePrice as _seats_concertround_v1_PackagePrice, PackagePrice__Output as _seats_concertround_v1_PackagePrice__Output } from '../../../seats/concertround/v1/PackagePrice';

export interface RoundPricing {
  'roundId'?: (string);
  'prices'?: (_seats_concertround_v1_PackagePrice)[];
  'extraPersonFee'?: (number);
}

export interface RoundPricing__Output {
  'roundId': (string);
  'prices': (_seats_concertround_v1_PackagePrice__Output)[];
  'extraPersonFee': (number);
}
