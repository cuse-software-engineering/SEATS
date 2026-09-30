// Original file: proto/table_availability.proto

import type { InitialTable as _seats_tableavailability_v1_InitialTable, InitialTable__Output as _seats_tableavailability_v1_InitialTable__Output } from '../../../seats/tableavailability/v1/InitialTable';

export interface CreateRoundTableStatusRequest {
  'roundId'?: (string);
  'tables'?: (_seats_tableavailability_v1_InitialTable)[];
}

export interface CreateRoundTableStatusRequest__Output {
  'roundId': (string);
  'tables': (_seats_tableavailability_v1_InitialTable__Output)[];
}
