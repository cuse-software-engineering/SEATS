// Original file: proto/booking.proto


export interface CustomerProfileRequest {
  'name'?: (string);
  'phone'?: (string);
  'consent'?: (boolean);
  '_name'?: "name";
  '_phone'?: "phone";
  '_consent'?: "consent";
}

export interface CustomerProfileRequest__Output {
  'name'?: (string);
  'phone'?: (string);
  'consent'?: (boolean);
}
