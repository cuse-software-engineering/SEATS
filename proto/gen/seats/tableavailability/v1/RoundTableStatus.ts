// Original file: proto/table_availability.proto

import type { TableStatus as _seats_tableavailability_v1_TableStatus, TableStatus__Output as _seats_tableavailability_v1_TableStatus__Output } from '../../../seats/tableavailability/v1/TableStatus';
import type { Long } from '@grpc/proto-loader';

export interface RoundTableStatus {
  'roundId'?: (string);
  'version'?: (number | string | Long);
  'tables'?: (_seats_tableavailability_v1_TableStatus)[];
}

export interface RoundTableStatus__Output {
  'roundId': (string);
  'version': (number);
  'tables': (_seats_tableavailability_v1_TableStatus__Output)[];
}
