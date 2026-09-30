// Original file: proto/staff_account.proto


export interface UpdateStaffAccountRequest {
  'staffAccountId'?: (string);
  'role'?: (string);
  'password'?: (string);
  '_role'?: "role";
  '_password'?: "password";
}

export interface UpdateStaffAccountRequest__Output {
  'staffAccountId': (string);
  'role'?: (string);
  'password'?: (string);
}
