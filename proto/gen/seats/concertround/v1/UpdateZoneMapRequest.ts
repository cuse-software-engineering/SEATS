// Original file: proto/concert_round.proto

import type { ZoneList as _seats_concertround_v1_ZoneList, ZoneList__Output as _seats_concertround_v1_ZoneList__Output } from '../../../seats/concertround/v1/ZoneList';
import type { ZoneMapTableList as _seats_concertround_v1_ZoneMapTableList, ZoneMapTableList__Output as _seats_concertround_v1_ZoneMapTableList__Output } from '../../../seats/concertround/v1/ZoneMapTableList';

export interface UpdateZoneMapRequest {
  'zoneMapId'?: (string);
  'name'?: (string);
  'zones'?: (_seats_concertround_v1_ZoneList | null);
  'tables'?: (_seats_concertround_v1_ZoneMapTableList | null);
  '_name'?: "name";
}

export interface UpdateZoneMapRequest__Output {
  'zoneMapId': (string);
  'name'?: (string);
  'zones': (_seats_concertround_v1_ZoneList__Output | null);
  'tables': (_seats_concertround_v1_ZoneMapTableList__Output | null);
}
