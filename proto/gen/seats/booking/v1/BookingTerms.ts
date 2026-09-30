// Original file: proto/booking.proto

import type { CheckInWindow as _seats_booking_v1_CheckInWindow, CheckInWindow__Output as _seats_booking_v1_CheckInWindow__Output } from '../../../seats/booking/v1/CheckInWindow';

export interface BookingTerms {
  'bookingId'?: (string);
  'terms'?: (string)[];
  'checkInWindow'?: (_seats_booking_v1_CheckInWindow | null);
}

export interface BookingTerms__Output {
  'bookingId': (string);
  'terms': (string)[];
  'checkInWindow': (_seats_booking_v1_CheckInWindow__Output | null);
}
