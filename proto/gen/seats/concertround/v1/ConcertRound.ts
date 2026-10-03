// Original file: proto/concert_round.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { BusinessParameters as _seats_concertround_v1_BusinessParameters, BusinessParameters__Output as _seats_concertround_v1_BusinessParameters__Output } from '../../../seats/concertround/v1/BusinessParameters';
import type { CheckInWindow as _seats_concertround_v1_CheckInWindow, CheckInWindow__Output as _seats_concertround_v1_CheckInWindow__Output } from '../../../seats/concertround/v1/CheckInWindow';
import type { CreateRoundRequest as _seats_concertround_v1_CreateRoundRequest, CreateRoundRequest__Output as _seats_concertround_v1_CreateRoundRequest__Output } from '../../../seats/concertround/v1/CreateRoundRequest';
import type { CreateZoneMapRequest as _seats_concertround_v1_CreateZoneMapRequest, CreateZoneMapRequest__Output as _seats_concertround_v1_CreateZoneMapRequest__Output } from '../../../seats/concertround/v1/CreateZoneMapRequest';
import type { DefineTableTypeRequest as _seats_concertround_v1_DefineTableTypeRequest, DefineTableTypeRequest__Output as _seats_concertround_v1_DefineTableTypeRequest__Output } from '../../../seats/concertround/v1/DefineTableTypeRequest';
import type { Empty as _seats_concertround_v1_Empty, Empty__Output as _seats_concertround_v1_Empty__Output } from '../../../seats/concertround/v1/Empty';
import type { ListZoneMapsRequest as _seats_concertround_v1_ListZoneMapsRequest, ListZoneMapsRequest__Output as _seats_concertround_v1_ListZoneMapsRequest__Output } from '../../../seats/concertround/v1/ListZoneMapsRequest';
import type { Removed as _seats_concertround_v1_Removed, Removed__Output as _seats_concertround_v1_Removed__Output } from '../../../seats/concertround/v1/Removed';
import type { Round as _seats_concertround_v1_Round, Round__Output as _seats_concertround_v1_Round__Output } from '../../../seats/concertround/v1/Round';
import type { RoundList as _seats_concertround_v1_RoundList, RoundList__Output as _seats_concertround_v1_RoundList__Output } from '../../../seats/concertround/v1/RoundList';
import type { RoundPricing as _seats_concertround_v1_RoundPricing, RoundPricing__Output as _seats_concertround_v1_RoundPricing__Output } from '../../../seats/concertround/v1/RoundPricing';
import type { RoundRef as _seats_concertround_v1_RoundRef, RoundRef__Output as _seats_concertround_v1_RoundRef__Output } from '../../../seats/concertround/v1/RoundRef';
import type { RoundTableList as _seats_concertround_v1_RoundTableList, RoundTableList__Output as _seats_concertround_v1_RoundTableList__Output } from '../../../seats/concertround/v1/RoundTableList';
import type { TableType as _seats_concertround_v1_TableType, TableType__Output as _seats_concertround_v1_TableType__Output } from '../../../seats/concertround/v1/TableType';
import type { TableTypeList as _seats_concertround_v1_TableTypeList, TableTypeList__Output as _seats_concertround_v1_TableTypeList__Output } from '../../../seats/concertround/v1/TableTypeList';
import type { UpcomingRoundList as _seats_concertround_v1_UpcomingRoundList, UpcomingRoundList__Output as _seats_concertround_v1_UpcomingRoundList__Output } from '../../../seats/concertround/v1/UpcomingRoundList';
import type { UpdateBusinessParametersRequest as _seats_concertround_v1_UpdateBusinessParametersRequest, UpdateBusinessParametersRequest__Output as _seats_concertround_v1_UpdateBusinessParametersRequest__Output } from '../../../seats/concertround/v1/UpdateBusinessParametersRequest';
import type { UpdateRoundRequest as _seats_concertround_v1_UpdateRoundRequest, UpdateRoundRequest__Output as _seats_concertround_v1_UpdateRoundRequest__Output } from '../../../seats/concertround/v1/UpdateRoundRequest';
import type { UpdateZoneMapRequest as _seats_concertround_v1_UpdateZoneMapRequest, UpdateZoneMapRequest__Output as _seats_concertround_v1_UpdateZoneMapRequest__Output } from '../../../seats/concertround/v1/UpdateZoneMapRequest';
import type { UploadZoneMapImageRequest as _seats_concertround_v1_UploadZoneMapImageRequest, UploadZoneMapImageRequest__Output as _seats_concertround_v1_UploadZoneMapImageRequest__Output } from '../../../seats/concertround/v1/UploadZoneMapImageRequest';
import type { ValidationResult as _seats_concertround_v1_ValidationResult, ValidationResult__Output as _seats_concertround_v1_ValidationResult__Output } from '../../../seats/concertround/v1/ValidationResult';
import type { ZoneMap as _seats_concertround_v1_ZoneMap, ZoneMap__Output as _seats_concertround_v1_ZoneMap__Output } from '../../../seats/concertround/v1/ZoneMap';
import type { ZoneMapList as _seats_concertround_v1_ZoneMapList, ZoneMapList__Output as _seats_concertround_v1_ZoneMapList__Output } from '../../../seats/concertround/v1/ZoneMapList';
import type { ZoneMapRef as _seats_concertround_v1_ZoneMapRef, ZoneMapRef__Output as _seats_concertround_v1_ZoneMapRef__Output } from '../../../seats/concertround/v1/ZoneMapRef';

export interface ConcertRoundClient extends grpc.Client {
  ActivateZoneMap(argument: _seats_concertround_v1_ZoneMapRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  ActivateZoneMap(argument: _seats_concertround_v1_ZoneMapRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  ActivateZoneMap(argument: _seats_concertround_v1_ZoneMapRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  ActivateZoneMap(argument: _seats_concertround_v1_ZoneMapRef, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  activateZoneMap(argument: _seats_concertround_v1_ZoneMapRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  activateZoneMap(argument: _seats_concertround_v1_ZoneMapRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  activateZoneMap(argument: _seats_concertround_v1_ZoneMapRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  activateZoneMap(argument: _seats_concertround_v1_ZoneMapRef, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  
  CreateRound(argument: _seats_concertround_v1_CreateRoundRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  CreateRound(argument: _seats_concertround_v1_CreateRoundRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  CreateRound(argument: _seats_concertround_v1_CreateRoundRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  CreateRound(argument: _seats_concertround_v1_CreateRoundRequest, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  createRound(argument: _seats_concertround_v1_CreateRoundRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  createRound(argument: _seats_concertround_v1_CreateRoundRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  createRound(argument: _seats_concertround_v1_CreateRoundRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  createRound(argument: _seats_concertround_v1_CreateRoundRequest, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  
  CreateZoneMap(argument: _seats_concertround_v1_CreateZoneMapRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  CreateZoneMap(argument: _seats_concertround_v1_CreateZoneMapRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  CreateZoneMap(argument: _seats_concertround_v1_CreateZoneMapRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  CreateZoneMap(argument: _seats_concertround_v1_CreateZoneMapRequest, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  createZoneMap(argument: _seats_concertround_v1_CreateZoneMapRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  createZoneMap(argument: _seats_concertround_v1_CreateZoneMapRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  createZoneMap(argument: _seats_concertround_v1_CreateZoneMapRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  createZoneMap(argument: _seats_concertround_v1_CreateZoneMapRequest, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  
  DefineTableType(argument: _seats_concertround_v1_DefineTableTypeRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_TableType__Output>): grpc.ClientUnaryCall;
  DefineTableType(argument: _seats_concertround_v1_DefineTableTypeRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_TableType__Output>): grpc.ClientUnaryCall;
  DefineTableType(argument: _seats_concertround_v1_DefineTableTypeRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_TableType__Output>): grpc.ClientUnaryCall;
  DefineTableType(argument: _seats_concertround_v1_DefineTableTypeRequest, callback: grpc.requestCallback<_seats_concertround_v1_TableType__Output>): grpc.ClientUnaryCall;
  defineTableType(argument: _seats_concertround_v1_DefineTableTypeRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_TableType__Output>): grpc.ClientUnaryCall;
  defineTableType(argument: _seats_concertround_v1_DefineTableTypeRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_TableType__Output>): grpc.ClientUnaryCall;
  defineTableType(argument: _seats_concertround_v1_DefineTableTypeRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_TableType__Output>): grpc.ClientUnaryCall;
  defineTableType(argument: _seats_concertround_v1_DefineTableTypeRequest, callback: grpc.requestCallback<_seats_concertround_v1_TableType__Output>): grpc.ClientUnaryCall;
  
  DiscardDraftRound(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Removed__Output>): grpc.ClientUnaryCall;
  DiscardDraftRound(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_Removed__Output>): grpc.ClientUnaryCall;
  DiscardDraftRound(argument: _seats_concertround_v1_RoundRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Removed__Output>): grpc.ClientUnaryCall;
  DiscardDraftRound(argument: _seats_concertround_v1_RoundRef, callback: grpc.requestCallback<_seats_concertround_v1_Removed__Output>): grpc.ClientUnaryCall;
  discardDraftRound(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Removed__Output>): grpc.ClientUnaryCall;
  discardDraftRound(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_Removed__Output>): grpc.ClientUnaryCall;
  discardDraftRound(argument: _seats_concertround_v1_RoundRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Removed__Output>): grpc.ClientUnaryCall;
  discardDraftRound(argument: _seats_concertround_v1_RoundRef, callback: grpc.requestCallback<_seats_concertround_v1_Removed__Output>): grpc.ClientUnaryCall;
  
  DiscardDraftZoneMap(argument: _seats_concertround_v1_ZoneMapRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Removed__Output>): grpc.ClientUnaryCall;
  DiscardDraftZoneMap(argument: _seats_concertround_v1_ZoneMapRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_Removed__Output>): grpc.ClientUnaryCall;
  DiscardDraftZoneMap(argument: _seats_concertround_v1_ZoneMapRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Removed__Output>): grpc.ClientUnaryCall;
  DiscardDraftZoneMap(argument: _seats_concertround_v1_ZoneMapRef, callback: grpc.requestCallback<_seats_concertround_v1_Removed__Output>): grpc.ClientUnaryCall;
  discardDraftZoneMap(argument: _seats_concertround_v1_ZoneMapRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Removed__Output>): grpc.ClientUnaryCall;
  discardDraftZoneMap(argument: _seats_concertround_v1_ZoneMapRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_Removed__Output>): grpc.ClientUnaryCall;
  discardDraftZoneMap(argument: _seats_concertround_v1_ZoneMapRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Removed__Output>): grpc.ClientUnaryCall;
  discardDraftZoneMap(argument: _seats_concertround_v1_ZoneMapRef, callback: grpc.requestCallback<_seats_concertround_v1_Removed__Output>): grpc.ClientUnaryCall;
  
  GetBusinessParameters(argument: _seats_concertround_v1_Empty, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_BusinessParameters__Output>): grpc.ClientUnaryCall;
  GetBusinessParameters(argument: _seats_concertround_v1_Empty, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_BusinessParameters__Output>): grpc.ClientUnaryCall;
  GetBusinessParameters(argument: _seats_concertround_v1_Empty, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_BusinessParameters__Output>): grpc.ClientUnaryCall;
  GetBusinessParameters(argument: _seats_concertround_v1_Empty, callback: grpc.requestCallback<_seats_concertround_v1_BusinessParameters__Output>): grpc.ClientUnaryCall;
  getBusinessParameters(argument: _seats_concertround_v1_Empty, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_BusinessParameters__Output>): grpc.ClientUnaryCall;
  getBusinessParameters(argument: _seats_concertround_v1_Empty, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_BusinessParameters__Output>): grpc.ClientUnaryCall;
  getBusinessParameters(argument: _seats_concertround_v1_Empty, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_BusinessParameters__Output>): grpc.ClientUnaryCall;
  getBusinessParameters(argument: _seats_concertround_v1_Empty, callback: grpc.requestCallback<_seats_concertround_v1_BusinessParameters__Output>): grpc.ClientUnaryCall;
  
  GetCheckInWindow(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_CheckInWindow__Output>): grpc.ClientUnaryCall;
  GetCheckInWindow(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_CheckInWindow__Output>): grpc.ClientUnaryCall;
  GetCheckInWindow(argument: _seats_concertround_v1_RoundRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_CheckInWindow__Output>): grpc.ClientUnaryCall;
  GetCheckInWindow(argument: _seats_concertround_v1_RoundRef, callback: grpc.requestCallback<_seats_concertround_v1_CheckInWindow__Output>): grpc.ClientUnaryCall;
  getCheckInWindow(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_CheckInWindow__Output>): grpc.ClientUnaryCall;
  getCheckInWindow(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_CheckInWindow__Output>): grpc.ClientUnaryCall;
  getCheckInWindow(argument: _seats_concertround_v1_RoundRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_CheckInWindow__Output>): grpc.ClientUnaryCall;
  getCheckInWindow(argument: _seats_concertround_v1_RoundRef, callback: grpc.requestCallback<_seats_concertround_v1_CheckInWindow__Output>): grpc.ClientUnaryCall;
  
  GetRound(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  GetRound(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  GetRound(argument: _seats_concertround_v1_RoundRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  GetRound(argument: _seats_concertround_v1_RoundRef, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  getRound(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  getRound(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  getRound(argument: _seats_concertround_v1_RoundRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  getRound(argument: _seats_concertround_v1_RoundRef, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  
  GetRoundPricing(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_RoundPricing__Output>): grpc.ClientUnaryCall;
  GetRoundPricing(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_RoundPricing__Output>): grpc.ClientUnaryCall;
  GetRoundPricing(argument: _seats_concertround_v1_RoundRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_RoundPricing__Output>): grpc.ClientUnaryCall;
  GetRoundPricing(argument: _seats_concertround_v1_RoundRef, callback: grpc.requestCallback<_seats_concertround_v1_RoundPricing__Output>): grpc.ClientUnaryCall;
  getRoundPricing(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_RoundPricing__Output>): grpc.ClientUnaryCall;
  getRoundPricing(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_RoundPricing__Output>): grpc.ClientUnaryCall;
  getRoundPricing(argument: _seats_concertround_v1_RoundRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_RoundPricing__Output>): grpc.ClientUnaryCall;
  getRoundPricing(argument: _seats_concertround_v1_RoundRef, callback: grpc.requestCallback<_seats_concertround_v1_RoundPricing__Output>): grpc.ClientUnaryCall;
  
  GetRoundTables(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_RoundTableList__Output>): grpc.ClientUnaryCall;
  GetRoundTables(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_RoundTableList__Output>): grpc.ClientUnaryCall;
  GetRoundTables(argument: _seats_concertround_v1_RoundRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_RoundTableList__Output>): grpc.ClientUnaryCall;
  GetRoundTables(argument: _seats_concertround_v1_RoundRef, callback: grpc.requestCallback<_seats_concertround_v1_RoundTableList__Output>): grpc.ClientUnaryCall;
  getRoundTables(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_RoundTableList__Output>): grpc.ClientUnaryCall;
  getRoundTables(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_RoundTableList__Output>): grpc.ClientUnaryCall;
  getRoundTables(argument: _seats_concertround_v1_RoundRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_RoundTableList__Output>): grpc.ClientUnaryCall;
  getRoundTables(argument: _seats_concertround_v1_RoundRef, callback: grpc.requestCallback<_seats_concertround_v1_RoundTableList__Output>): grpc.ClientUnaryCall;
  
  GetUpcomingRounds(argument: _seats_concertround_v1_Empty, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_UpcomingRoundList__Output>): grpc.ClientUnaryCall;
  GetUpcomingRounds(argument: _seats_concertround_v1_Empty, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_UpcomingRoundList__Output>): grpc.ClientUnaryCall;
  GetUpcomingRounds(argument: _seats_concertround_v1_Empty, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_UpcomingRoundList__Output>): grpc.ClientUnaryCall;
  GetUpcomingRounds(argument: _seats_concertround_v1_Empty, callback: grpc.requestCallback<_seats_concertround_v1_UpcomingRoundList__Output>): grpc.ClientUnaryCall;
  getUpcomingRounds(argument: _seats_concertround_v1_Empty, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_UpcomingRoundList__Output>): grpc.ClientUnaryCall;
  getUpcomingRounds(argument: _seats_concertround_v1_Empty, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_UpcomingRoundList__Output>): grpc.ClientUnaryCall;
  getUpcomingRounds(argument: _seats_concertround_v1_Empty, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_UpcomingRoundList__Output>): grpc.ClientUnaryCall;
  getUpcomingRounds(argument: _seats_concertround_v1_Empty, callback: grpc.requestCallback<_seats_concertround_v1_UpcomingRoundList__Output>): grpc.ClientUnaryCall;
  
  GetZoneMap(argument: _seats_concertround_v1_ZoneMapRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  GetZoneMap(argument: _seats_concertround_v1_ZoneMapRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  GetZoneMap(argument: _seats_concertround_v1_ZoneMapRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  GetZoneMap(argument: _seats_concertround_v1_ZoneMapRef, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  getZoneMap(argument: _seats_concertround_v1_ZoneMapRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  getZoneMap(argument: _seats_concertround_v1_ZoneMapRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  getZoneMap(argument: _seats_concertround_v1_ZoneMapRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  getZoneMap(argument: _seats_concertround_v1_ZoneMapRef, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  
  ListRounds(argument: _seats_concertround_v1_Empty, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_RoundList__Output>): grpc.ClientUnaryCall;
  ListRounds(argument: _seats_concertround_v1_Empty, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_RoundList__Output>): grpc.ClientUnaryCall;
  ListRounds(argument: _seats_concertround_v1_Empty, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_RoundList__Output>): grpc.ClientUnaryCall;
  ListRounds(argument: _seats_concertround_v1_Empty, callback: grpc.requestCallback<_seats_concertround_v1_RoundList__Output>): grpc.ClientUnaryCall;
  listRounds(argument: _seats_concertround_v1_Empty, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_RoundList__Output>): grpc.ClientUnaryCall;
  listRounds(argument: _seats_concertround_v1_Empty, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_RoundList__Output>): grpc.ClientUnaryCall;
  listRounds(argument: _seats_concertround_v1_Empty, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_RoundList__Output>): grpc.ClientUnaryCall;
  listRounds(argument: _seats_concertround_v1_Empty, callback: grpc.requestCallback<_seats_concertround_v1_RoundList__Output>): grpc.ClientUnaryCall;
  
  ListTableTypes(argument: _seats_concertround_v1_Empty, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_TableTypeList__Output>): grpc.ClientUnaryCall;
  ListTableTypes(argument: _seats_concertround_v1_Empty, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_TableTypeList__Output>): grpc.ClientUnaryCall;
  ListTableTypes(argument: _seats_concertround_v1_Empty, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_TableTypeList__Output>): grpc.ClientUnaryCall;
  ListTableTypes(argument: _seats_concertround_v1_Empty, callback: grpc.requestCallback<_seats_concertround_v1_TableTypeList__Output>): grpc.ClientUnaryCall;
  listTableTypes(argument: _seats_concertround_v1_Empty, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_TableTypeList__Output>): grpc.ClientUnaryCall;
  listTableTypes(argument: _seats_concertround_v1_Empty, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_TableTypeList__Output>): grpc.ClientUnaryCall;
  listTableTypes(argument: _seats_concertround_v1_Empty, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_TableTypeList__Output>): grpc.ClientUnaryCall;
  listTableTypes(argument: _seats_concertround_v1_Empty, callback: grpc.requestCallback<_seats_concertround_v1_TableTypeList__Output>): grpc.ClientUnaryCall;
  
  ListZoneMaps(argument: _seats_concertround_v1_ListZoneMapsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMapList__Output>): grpc.ClientUnaryCall;
  ListZoneMaps(argument: _seats_concertround_v1_ListZoneMapsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMapList__Output>): grpc.ClientUnaryCall;
  ListZoneMaps(argument: _seats_concertround_v1_ListZoneMapsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMapList__Output>): grpc.ClientUnaryCall;
  ListZoneMaps(argument: _seats_concertround_v1_ListZoneMapsRequest, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMapList__Output>): grpc.ClientUnaryCall;
  listZoneMaps(argument: _seats_concertround_v1_ListZoneMapsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMapList__Output>): grpc.ClientUnaryCall;
  listZoneMaps(argument: _seats_concertround_v1_ListZoneMapsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMapList__Output>): grpc.ClientUnaryCall;
  listZoneMaps(argument: _seats_concertround_v1_ListZoneMapsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMapList__Output>): grpc.ClientUnaryCall;
  listZoneMaps(argument: _seats_concertround_v1_ListZoneMapsRequest, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMapList__Output>): grpc.ClientUnaryCall;
  
  PublishRound(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  PublishRound(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  PublishRound(argument: _seats_concertround_v1_RoundRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  PublishRound(argument: _seats_concertround_v1_RoundRef, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  publishRound(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  publishRound(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  publishRound(argument: _seats_concertround_v1_RoundRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  publishRound(argument: _seats_concertround_v1_RoundRef, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  
  UpdateBusinessParameters(argument: _seats_concertround_v1_UpdateBusinessParametersRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_BusinessParameters__Output>): grpc.ClientUnaryCall;
  UpdateBusinessParameters(argument: _seats_concertround_v1_UpdateBusinessParametersRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_BusinessParameters__Output>): grpc.ClientUnaryCall;
  UpdateBusinessParameters(argument: _seats_concertround_v1_UpdateBusinessParametersRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_BusinessParameters__Output>): grpc.ClientUnaryCall;
  UpdateBusinessParameters(argument: _seats_concertround_v1_UpdateBusinessParametersRequest, callback: grpc.requestCallback<_seats_concertround_v1_BusinessParameters__Output>): grpc.ClientUnaryCall;
  updateBusinessParameters(argument: _seats_concertround_v1_UpdateBusinessParametersRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_BusinessParameters__Output>): grpc.ClientUnaryCall;
  updateBusinessParameters(argument: _seats_concertround_v1_UpdateBusinessParametersRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_BusinessParameters__Output>): grpc.ClientUnaryCall;
  updateBusinessParameters(argument: _seats_concertround_v1_UpdateBusinessParametersRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_BusinessParameters__Output>): grpc.ClientUnaryCall;
  updateBusinessParameters(argument: _seats_concertround_v1_UpdateBusinessParametersRequest, callback: grpc.requestCallback<_seats_concertround_v1_BusinessParameters__Output>): grpc.ClientUnaryCall;
  
  UpdateRound(argument: _seats_concertround_v1_UpdateRoundRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  UpdateRound(argument: _seats_concertround_v1_UpdateRoundRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  UpdateRound(argument: _seats_concertround_v1_UpdateRoundRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  UpdateRound(argument: _seats_concertround_v1_UpdateRoundRequest, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  updateRound(argument: _seats_concertround_v1_UpdateRoundRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  updateRound(argument: _seats_concertround_v1_UpdateRoundRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  updateRound(argument: _seats_concertround_v1_UpdateRoundRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  updateRound(argument: _seats_concertround_v1_UpdateRoundRequest, callback: grpc.requestCallback<_seats_concertround_v1_Round__Output>): grpc.ClientUnaryCall;
  
  UpdateZoneMap(argument: _seats_concertround_v1_UpdateZoneMapRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  UpdateZoneMap(argument: _seats_concertround_v1_UpdateZoneMapRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  UpdateZoneMap(argument: _seats_concertround_v1_UpdateZoneMapRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  UpdateZoneMap(argument: _seats_concertround_v1_UpdateZoneMapRequest, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  updateZoneMap(argument: _seats_concertround_v1_UpdateZoneMapRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  updateZoneMap(argument: _seats_concertround_v1_UpdateZoneMapRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  updateZoneMap(argument: _seats_concertround_v1_UpdateZoneMapRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  updateZoneMap(argument: _seats_concertround_v1_UpdateZoneMapRequest, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  
  UploadZoneMapImage(argument: _seats_concertround_v1_UploadZoneMapImageRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  UploadZoneMapImage(argument: _seats_concertround_v1_UploadZoneMapImageRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  UploadZoneMapImage(argument: _seats_concertround_v1_UploadZoneMapImageRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  UploadZoneMapImage(argument: _seats_concertround_v1_UploadZoneMapImageRequest, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  uploadZoneMapImage(argument: _seats_concertround_v1_UploadZoneMapImageRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  uploadZoneMapImage(argument: _seats_concertround_v1_UploadZoneMapImageRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  uploadZoneMapImage(argument: _seats_concertround_v1_UploadZoneMapImageRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  uploadZoneMapImage(argument: _seats_concertround_v1_UploadZoneMapImageRequest, callback: grpc.requestCallback<_seats_concertround_v1_ZoneMap__Output>): grpc.ClientUnaryCall;
  
  ValidateRound(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ValidationResult__Output>): grpc.ClientUnaryCall;
  ValidateRound(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_ValidationResult__Output>): grpc.ClientUnaryCall;
  ValidateRound(argument: _seats_concertround_v1_RoundRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ValidationResult__Output>): grpc.ClientUnaryCall;
  ValidateRound(argument: _seats_concertround_v1_RoundRef, callback: grpc.requestCallback<_seats_concertround_v1_ValidationResult__Output>): grpc.ClientUnaryCall;
  validateRound(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ValidationResult__Output>): grpc.ClientUnaryCall;
  validateRound(argument: _seats_concertround_v1_RoundRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_ValidationResult__Output>): grpc.ClientUnaryCall;
  validateRound(argument: _seats_concertround_v1_RoundRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ValidationResult__Output>): grpc.ClientUnaryCall;
  validateRound(argument: _seats_concertround_v1_RoundRef, callback: grpc.requestCallback<_seats_concertround_v1_ValidationResult__Output>): grpc.ClientUnaryCall;
  
  ValidateZoneMap(argument: _seats_concertround_v1_ZoneMapRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ValidationResult__Output>): grpc.ClientUnaryCall;
  ValidateZoneMap(argument: _seats_concertround_v1_ZoneMapRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_ValidationResult__Output>): grpc.ClientUnaryCall;
  ValidateZoneMap(argument: _seats_concertround_v1_ZoneMapRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ValidationResult__Output>): grpc.ClientUnaryCall;
  ValidateZoneMap(argument: _seats_concertround_v1_ZoneMapRef, callback: grpc.requestCallback<_seats_concertround_v1_ValidationResult__Output>): grpc.ClientUnaryCall;
  validateZoneMap(argument: _seats_concertround_v1_ZoneMapRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ValidationResult__Output>): grpc.ClientUnaryCall;
  validateZoneMap(argument: _seats_concertround_v1_ZoneMapRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_concertround_v1_ValidationResult__Output>): grpc.ClientUnaryCall;
  validateZoneMap(argument: _seats_concertround_v1_ZoneMapRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_concertround_v1_ValidationResult__Output>): grpc.ClientUnaryCall;
  validateZoneMap(argument: _seats_concertround_v1_ZoneMapRef, callback: grpc.requestCallback<_seats_concertround_v1_ValidationResult__Output>): grpc.ClientUnaryCall;
  
}

export interface ConcertRoundHandlers extends grpc.UntypedServiceImplementation {
  ActivateZoneMap: grpc.handleUnaryCall<_seats_concertround_v1_ZoneMapRef__Output, _seats_concertround_v1_ZoneMap>;
  
  CreateRound: grpc.handleUnaryCall<_seats_concertround_v1_CreateRoundRequest__Output, _seats_concertround_v1_Round>;
  
  CreateZoneMap: grpc.handleUnaryCall<_seats_concertround_v1_CreateZoneMapRequest__Output, _seats_concertround_v1_ZoneMap>;
  
  DefineTableType: grpc.handleUnaryCall<_seats_concertround_v1_DefineTableTypeRequest__Output, _seats_concertround_v1_TableType>;
  
  DiscardDraftRound: grpc.handleUnaryCall<_seats_concertround_v1_RoundRef__Output, _seats_concertround_v1_Removed>;
  
  DiscardDraftZoneMap: grpc.handleUnaryCall<_seats_concertround_v1_ZoneMapRef__Output, _seats_concertround_v1_Removed>;
  
  GetBusinessParameters: grpc.handleUnaryCall<_seats_concertround_v1_Empty__Output, _seats_concertround_v1_BusinessParameters>;
  
  GetCheckInWindow: grpc.handleUnaryCall<_seats_concertround_v1_RoundRef__Output, _seats_concertround_v1_CheckInWindow>;
  
  GetRound: grpc.handleUnaryCall<_seats_concertround_v1_RoundRef__Output, _seats_concertround_v1_Round>;
  
  GetRoundPricing: grpc.handleUnaryCall<_seats_concertround_v1_RoundRef__Output, _seats_concertround_v1_RoundPricing>;
  
  GetRoundTables: grpc.handleUnaryCall<_seats_concertround_v1_RoundRef__Output, _seats_concertround_v1_RoundTableList>;
  
  GetUpcomingRounds: grpc.handleUnaryCall<_seats_concertround_v1_Empty__Output, _seats_concertround_v1_UpcomingRoundList>;
  
  GetZoneMap: grpc.handleUnaryCall<_seats_concertround_v1_ZoneMapRef__Output, _seats_concertround_v1_ZoneMap>;
  
  ListRounds: grpc.handleUnaryCall<_seats_concertround_v1_Empty__Output, _seats_concertround_v1_RoundList>;
  
  ListTableTypes: grpc.handleUnaryCall<_seats_concertround_v1_Empty__Output, _seats_concertround_v1_TableTypeList>;
  
  ListZoneMaps: grpc.handleUnaryCall<_seats_concertround_v1_ListZoneMapsRequest__Output, _seats_concertround_v1_ZoneMapList>;
  
  PublishRound: grpc.handleUnaryCall<_seats_concertround_v1_RoundRef__Output, _seats_concertround_v1_Round>;
  
  UpdateBusinessParameters: grpc.handleUnaryCall<_seats_concertround_v1_UpdateBusinessParametersRequest__Output, _seats_concertround_v1_BusinessParameters>;
  
  UpdateRound: grpc.handleUnaryCall<_seats_concertround_v1_UpdateRoundRequest__Output, _seats_concertround_v1_Round>;
  
  UpdateZoneMap: grpc.handleUnaryCall<_seats_concertround_v1_UpdateZoneMapRequest__Output, _seats_concertround_v1_ZoneMap>;
  
  UploadZoneMapImage: grpc.handleUnaryCall<_seats_concertround_v1_UploadZoneMapImageRequest__Output, _seats_concertround_v1_ZoneMap>;
  
  ValidateRound: grpc.handleUnaryCall<_seats_concertround_v1_RoundRef__Output, _seats_concertround_v1_ValidationResult>;
  
  ValidateZoneMap: grpc.handleUnaryCall<_seats_concertround_v1_ZoneMapRef__Output, _seats_concertround_v1_ValidationResult>;
  
}

export interface ConcertRoundDefinition extends grpc.ServiceDefinition {
  ActivateZoneMap: MethodDefinition<_seats_concertround_v1_ZoneMapRef, _seats_concertround_v1_ZoneMap, _seats_concertround_v1_ZoneMapRef__Output, _seats_concertround_v1_ZoneMap__Output>
  CreateRound: MethodDefinition<_seats_concertround_v1_CreateRoundRequest, _seats_concertround_v1_Round, _seats_concertround_v1_CreateRoundRequest__Output, _seats_concertround_v1_Round__Output>
  CreateZoneMap: MethodDefinition<_seats_concertround_v1_CreateZoneMapRequest, _seats_concertround_v1_ZoneMap, _seats_concertround_v1_CreateZoneMapRequest__Output, _seats_concertround_v1_ZoneMap__Output>
  DefineTableType: MethodDefinition<_seats_concertround_v1_DefineTableTypeRequest, _seats_concertround_v1_TableType, _seats_concertround_v1_DefineTableTypeRequest__Output, _seats_concertround_v1_TableType__Output>
  DiscardDraftRound: MethodDefinition<_seats_concertround_v1_RoundRef, _seats_concertround_v1_Removed, _seats_concertround_v1_RoundRef__Output, _seats_concertround_v1_Removed__Output>
  DiscardDraftZoneMap: MethodDefinition<_seats_concertround_v1_ZoneMapRef, _seats_concertround_v1_Removed, _seats_concertround_v1_ZoneMapRef__Output, _seats_concertround_v1_Removed__Output>
  GetBusinessParameters: MethodDefinition<_seats_concertround_v1_Empty, _seats_concertround_v1_BusinessParameters, _seats_concertround_v1_Empty__Output, _seats_concertround_v1_BusinessParameters__Output>
  GetCheckInWindow: MethodDefinition<_seats_concertround_v1_RoundRef, _seats_concertround_v1_CheckInWindow, _seats_concertround_v1_RoundRef__Output, _seats_concertround_v1_CheckInWindow__Output>
  GetRound: MethodDefinition<_seats_concertround_v1_RoundRef, _seats_concertround_v1_Round, _seats_concertround_v1_RoundRef__Output, _seats_concertround_v1_Round__Output>
  GetRoundPricing: MethodDefinition<_seats_concertround_v1_RoundRef, _seats_concertround_v1_RoundPricing, _seats_concertround_v1_RoundRef__Output, _seats_concertround_v1_RoundPricing__Output>
  GetRoundTables: MethodDefinition<_seats_concertround_v1_RoundRef, _seats_concertround_v1_RoundTableList, _seats_concertround_v1_RoundRef__Output, _seats_concertround_v1_RoundTableList__Output>
  GetUpcomingRounds: MethodDefinition<_seats_concertround_v1_Empty, _seats_concertround_v1_UpcomingRoundList, _seats_concertround_v1_Empty__Output, _seats_concertround_v1_UpcomingRoundList__Output>
  GetZoneMap: MethodDefinition<_seats_concertround_v1_ZoneMapRef, _seats_concertround_v1_ZoneMap, _seats_concertround_v1_ZoneMapRef__Output, _seats_concertround_v1_ZoneMap__Output>
  ListRounds: MethodDefinition<_seats_concertround_v1_Empty, _seats_concertround_v1_RoundList, _seats_concertround_v1_Empty__Output, _seats_concertround_v1_RoundList__Output>
  ListTableTypes: MethodDefinition<_seats_concertround_v1_Empty, _seats_concertround_v1_TableTypeList, _seats_concertround_v1_Empty__Output, _seats_concertround_v1_TableTypeList__Output>
  ListZoneMaps: MethodDefinition<_seats_concertround_v1_ListZoneMapsRequest, _seats_concertround_v1_ZoneMapList, _seats_concertround_v1_ListZoneMapsRequest__Output, _seats_concertround_v1_ZoneMapList__Output>
  PublishRound: MethodDefinition<_seats_concertround_v1_RoundRef, _seats_concertround_v1_Round, _seats_concertround_v1_RoundRef__Output, _seats_concertround_v1_Round__Output>
  UpdateBusinessParameters: MethodDefinition<_seats_concertround_v1_UpdateBusinessParametersRequest, _seats_concertround_v1_BusinessParameters, _seats_concertround_v1_UpdateBusinessParametersRequest__Output, _seats_concertround_v1_BusinessParameters__Output>
  UpdateRound: MethodDefinition<_seats_concertround_v1_UpdateRoundRequest, _seats_concertround_v1_Round, _seats_concertround_v1_UpdateRoundRequest__Output, _seats_concertround_v1_Round__Output>
  UpdateZoneMap: MethodDefinition<_seats_concertround_v1_UpdateZoneMapRequest, _seats_concertround_v1_ZoneMap, _seats_concertround_v1_UpdateZoneMapRequest__Output, _seats_concertround_v1_ZoneMap__Output>
  UploadZoneMapImage: MethodDefinition<_seats_concertround_v1_UploadZoneMapImageRequest, _seats_concertround_v1_ZoneMap, _seats_concertround_v1_UploadZoneMapImageRequest__Output, _seats_concertround_v1_ZoneMap__Output>
  ValidateRound: MethodDefinition<_seats_concertround_v1_RoundRef, _seats_concertround_v1_ValidationResult, _seats_concertround_v1_RoundRef__Output, _seats_concertround_v1_ValidationResult__Output>
  ValidateZoneMap: MethodDefinition<_seats_concertround_v1_ZoneMapRef, _seats_concertround_v1_ValidationResult, _seats_concertround_v1_ZoneMapRef__Output, _seats_concertround_v1_ValidationResult__Output>
}
