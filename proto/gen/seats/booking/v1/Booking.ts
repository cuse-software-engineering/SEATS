// Original file: proto/booking.proto

import type { Fee as _seats_booking_v1_Fee, Fee__Output as _seats_booking_v1_Fee__Output } from '../../../seats/booking/v1/Fee';
import type { StatusChange as _seats_booking_v1_StatusChange, StatusChange__Output as _seats_booking_v1_StatusChange__Output } from '../../../seats/booking/v1/StatusChange';

export interface Booking {
  'id'?: (string);
  'customerId'?: (string);
  'roundId'?: (string);
  'tableNumber'?: (number);
  'zoneId'?: (string);
  'zoneName'?: (string);
  'tableTypeId'?: (string);
  'capacity'?: (number);
  'status'?: (string);
  'holdEndsAt'?: (string);
  'partySize'?: (number);
  'fee'?: (_seats_booking_v1_Fee | null);
  'termsAccepted'?: (boolean);
  'createdAt'?: (string);
  'history'?: (_seats_booking_v1_StatusChange)[];
  'remainingHoldSeconds'?: (number);
  '_partySize'?: "partySize";
}

export interface Booking__Output {
  'id': (string);
  'customerId': (string);
  'roundId': (string);
  'tableNumber': (number);
  'zoneId': (string);
  'zoneName': (string);
  'tableTypeId': (string);
  'capacity': (number);
  'status': (string);
  'holdEndsAt': (string);
  'partySize'?: (number);
  'fee': (_seats_booking_v1_Fee__Output | null);
  'termsAccepted': (boolean);
  'createdAt': (string);
  'history': (_seats_booking_v1_StatusChange__Output)[];
  'remainingHoldSeconds': (number);
}
