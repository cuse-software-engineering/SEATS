// Original file: proto/booking.proto

import type { Booking as _seats_booking_v1_Booking, Booking__Output as _seats_booking_v1_Booking__Output } from '../../../seats/booking/v1/Booking';

export interface VerificationResult {
  'valid'?: (boolean);
  'booking'?: (_seats_booking_v1_Booking | null);
  'reason'?: (string);
}

export interface VerificationResult__Output {
  'valid': (boolean);
  'booking': (_seats_booking_v1_Booking__Output | null);
  'reason': (string);
}
