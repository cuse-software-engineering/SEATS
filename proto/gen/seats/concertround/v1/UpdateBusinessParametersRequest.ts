// Original file: proto/concert_round.proto


export interface UpdateBusinessParametersRequest {
  'holdPeriodMinutes'?: (number);
  'checkInWindowHours'?: (number);
  'gracePeriodMinutes'?: (number);
  'extraPersonFee'?: (number);
  '_holdPeriodMinutes'?: "holdPeriodMinutes";
  '_checkInWindowHours'?: "checkInWindowHours";
  '_gracePeriodMinutes'?: "gracePeriodMinutes";
  '_extraPersonFee'?: "extraPersonFee";
}

export interface UpdateBusinessParametersRequest__Output {
  'holdPeriodMinutes'?: (number);
  'checkInWindowHours'?: (number);
  'gracePeriodMinutes'?: (number);
  'extraPersonFee'?: (number);
}
