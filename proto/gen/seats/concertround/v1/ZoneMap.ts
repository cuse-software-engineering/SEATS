// Original file: proto/concert_round.proto

import type { Zone as _seats_concertround_v1_Zone, Zone__Output as _seats_concertround_v1_Zone__Output } from '../../../seats/concertround/v1/Zone';
import type { ZoneMapTable as _seats_concertround_v1_ZoneMapTable, ZoneMapTable__Output as _seats_concertround_v1_ZoneMapTable__Output } from '../../../seats/concertround/v1/ZoneMapTable';
import type { ZoneSummary as _seats_concertround_v1_ZoneSummary, ZoneSummary__Output as _seats_concertround_v1_ZoneSummary__Output } from '../../../seats/concertround/v1/ZoneSummary';

export interface ZoneMap {
  'id'?: (string);
  'name'?: (string);
  'status'?: (string);
  'imageUrl'?: (string);
  'zones'?: (_seats_concertround_v1_Zone)[];
  'tables'?: (_seats_concertround_v1_ZoneMapTable)[];
  'createdAt'?: (string);
  'summary'?: (_seats_concertround_v1_ZoneSummary)[];
}

export interface ZoneMap__Output {
  'id': (string);
  'name': (string);
  'status': (string);
  'imageUrl': (string);
  'zones': (_seats_concertround_v1_Zone__Output)[];
  'tables': (_seats_concertround_v1_ZoneMapTable__Output)[];
  'createdAt': (string);
  'summary': (_seats_concertround_v1_ZoneSummary__Output)[];
}
