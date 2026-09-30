// Original file: proto/concert_round.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { CheckInWindow as _seats_concertround_v1_CheckInWindow, CheckInWindow__Output as _seats_concertround_v1_CheckInWindow__Output } from '../../../seats/concertround/v1/CheckInWindow';
import type { GetCheckInWindowRequest as _seats_concertround_v1_GetCheckInWindowRequest, GetCheckInWindowRequest__Output as _seats_concertround_v1_GetCheckInWindowRequest__Output } from '../../../seats/concertround/v1/GetCheckInWindowRequest';
import type { GetRoundPricingRequest as _seats_concertround_v1_GetRoundPricingRequest, GetRoundPricingRequest__Output as _seats_concertround_v1_GetRoundPricingRequest__Output } from '../../../seats/concertround/v1/GetRoundPricingRequest';
import type { GetRoundRequest as _seats_concertround_v1_GetRoundRequest, GetRoundRequest__Output as _seats_concertround_v1_GetRoundRequest__Output } from '../../../seats/concertround/v1/GetRoundRequest';
import type { Round as _seats_concertround_v1_Round, Round__Output as _seats_concertround_v1_Round__Output } from '../../../seats/concertround/v1/Round';
import type { RoundPricing as _seats_concertround_v1_RoundPricing, RoundPricing__Output as _seats_concertround_v1_RoundPricing__Output } from '../../../seats/concertround/v1/RoundPricing';

export interface ConcertRoundClient extends grpc.Client {
  GetCheckInWindow(argument: _seats_concertround_v1_GetCheckInWindowRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_CheckInWindow__Output>): grpc.ClientUnaryCall;
  GetCheckInWindow(argument: _seats_concertround_v1_GetCheckInWindowRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_CheckInWindow__Output>): grpc.ClientUnaryCall;
  GetCheckInWindow(argument: _seats_concertround_v1_GetCheckInWindowRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_CheckInWindow__Output>): grpc.ClientUnaryCall;
  GetCheckInWindow(argument: _seats_concertround_v1_GetCheckInWindowRequest, callback: grpc.requestCallback<_seats_concertround_v1_CheckInWindow__Output>): grpc.ClientUnaryCall;
  getCheckInWindow(argument: _seats_concertround_v1_GetCheckInWindowRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_CheckInWindow__Output>): grpc.ClientUnaryCall;
  getCheckInWindow(argument: _seats_concertround_v1_GetCheckInWindowRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_CheckInWindow__Output>): grpc.ClientUnaryCall;
  getCheckInWindow(argument: _seats_concertround_v1_GetCheckInWindowRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_CheckInWindow__Output>): grpc.ClientUnaryCall;
  getCheckInWindow(argument: _seats_concertround_v1_GetCheckInWindowRequest, callback: grpc.requestCallback<_seats_concertround_v1_CheckInWindow__Output>): grpc.ClientUnaryCall;
  
  GetRound(argument: _seats_concertround_v1_GetRoundRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  GetRound(argument: _seats_concertround_v1_GetRoundRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  GetRound(argument: _seats_concertround_v1_GetRoundRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  GetRound(argument: _seats_concertround_v1_GetRoundRequest, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  getRound(argument: _seats_concertround_v1_GetRoundRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  getRound(argument: _seats_concertround_v1_GetRoundRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  getRound(argument: _seats_concertround_v1_GetRoundRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  getRound(argument: _seats_concertround_v1_GetRoundRequest, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  
  GetRoundPricing(argument: _seats_concertround_v1_GetRoundPricingRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_RoundPricing__Output>): grpc.ClientUnaryCall;
  GetRoundPricing(argument: _seats_concertround_v1_GetRoundPricingRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_RoundPricing__Output>): grpc.ClientUnaryCall;
  GetRoundPricing(argument: _seats_concertround_v1_GetRoundPricingRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_RoundPricing__Output>): grpc.ClientUnaryCall;
  GetRoundPricing(argument: _seats_concertround_v1_GetRoundPricingRequest, callback: grpc.requestCallback<_seats_concertround_v1_RoundPricing__Output>): grpc.ClientUnaryCall;
  getRoundPricing(argument: _seats_concertround_v1_GetRoundPricingRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_RoundPricing__Output>): grpc.ClientUnaryCall;
  getRoundPricing(argument: _seats_concertround_v1_GetRoundPricingRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_RoundPricing__Output>): grpc.ClientUnaryCall;
  getRoundPricing(argument: _seats_concertround_v1_GetRoundPricingRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_RoundPricing__Output>): grpc.ClientUnaryCall;
  getRoundPricing(argument: _seats_concertround_v1_GetRoundPricingRequest, callback: grpc.requestCallback<_seats_concertround_v1_RoundPricing__Output>): grpc.ClientUnaryCall;
  
}

export interface ConcertRoundHandlers extends grpc.UntypedServiceImplementation {
  GetCheckInWindow: grpc.handleUnaryCall<_seats_concertround_v1_GetCheckInWindowRequest__Output, _seats_concertround_v1_CheckInWindow>;
  
  GetRound: grpc.handleUnaryCall<_seats_concertround_v1_GetRoundRequest__Output, _seats_concertround_v1_Round>;
  
  GetRoundPricing: grpc.handleUnaryCall<_seats_concertround_v1_GetRoundPricingRequest__Output, _seats_concertround_v1_RoundPricing>;
  
}

export interface ConcertRoundDefinition extends grpc.ServiceDefinition {
  GetCheckInWindow: MethodDefinition<_seats_concertround_v1_GetCheckInWindowRequest, _seats_concertround_v1_CheckInWindow, _seats_concertround_v1_GetCheckInWindowRequest__Output, _seats_concertround_v1_CheckInWindow__Output>
  GetRound: MethodDefinition<_seats_concertround_v1_GetRoundRequest, _seats_concertround_v1_Round, _seats_concertround_v1_GetRoundRequest__Output, _seats_concertround_v1_Round__Output>
  GetRoundPricing: MethodDefinition<_seats_concertround_v1_GetRoundPricingRequest, _seats_concertround_v1_RoundPricing, _seats_concertround_v1_GetRoundPricingRequest__Output, _seats_concertround_v1_RoundPricing__Output>
}
