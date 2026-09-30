// Original file: proto/table_availability.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { CountAvailableTablesRequest as _seats_tableavailability_v1_CountAvailableTablesRequest, CountAvailableTablesRequest__Output as _seats_tableavailability_v1_CountAvailableTablesRequest__Output } from '../../../seats/tableavailability/v1/CountAvailableTablesRequest';
import type { CountAvailableTablesResponse as _seats_tableavailability_v1_CountAvailableTablesResponse, CountAvailableTablesResponse__Output as _seats_tableavailability_v1_CountAvailableTablesResponse__Output } from '../../../seats/tableavailability/v1/CountAvailableTablesResponse';
import type { HoldTableRequest as _seats_tableavailability_v1_HoldTableRequest, HoldTableRequest__Output as _seats_tableavailability_v1_HoldTableRequest__Output } from '../../../seats/tableavailability/v1/HoldTableRequest';
import type { InitializeRoundTableStatusRequest as _seats_tableavailability_v1_InitializeRoundTableStatusRequest, InitializeRoundTableStatusRequest__Output as _seats_tableavailability_v1_InitializeRoundTableStatusRequest__Output } from '../../../seats/tableavailability/v1/InitializeRoundTableStatusRequest';
import type { RemoveRoundTableStatusResponse as _seats_tableavailability_v1_RemoveRoundTableStatusResponse, RemoveRoundTableStatusResponse__Output as _seats_tableavailability_v1_RemoveRoundTableStatusResponse__Output } from '../../../seats/tableavailability/v1/RemoveRoundTableStatusResponse';
import type { RoundRef as _seats_tableavailability_v1_RoundRef, RoundRef__Output as _seats_tableavailability_v1_RoundRef__Output } from '../../../seats/tableavailability/v1/RoundRef';
import type { RoundTableStatus as _seats_tableavailability_v1_RoundTableStatus, RoundTableStatus__Output as _seats_tableavailability_v1_RoundTableStatus__Output } from '../../../seats/tableavailability/v1/RoundTableStatus';
import type { TableRef as _seats_tableavailability_v1_TableRef, TableRef__Output as _seats_tableavailability_v1_TableRef__Output } from '../../../seats/tableavailability/v1/TableRef';
import type { TableStatus as _seats_tableavailability_v1_TableStatus, TableStatus__Output as _seats_tableavailability_v1_TableStatus__Output } from '../../../seats/tableavailability/v1/TableStatus';

export interface TableAvailabilityClient extends grpc.Client {
  CountAvailableTables(argument: _seats_tableavailability_v1_CountAvailableTablesRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_CountAvailableTablesResponse__Output>): grpc.ClientUnaryCall;
  CountAvailableTables(argument: _seats_tableavailability_v1_CountAvailableTablesRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_tableavailability_v1_CountAvailableTablesResponse__Output>): grpc.ClientUnaryCall;
  CountAvailableTables(argument: _seats_tableavailability_v1_CountAvailableTablesRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_CountAvailableTablesResponse__Output>): grpc.ClientUnaryCall;
  CountAvailableTables(argument: _seats_tableavailability_v1_CountAvailableTablesRequest, callback: grpc.requestCallback<_seats_tableavailability_v1_CountAvailableTablesResponse__Output>): grpc.ClientUnaryCall;
  countAvailableTables(argument: _seats_tableavailability_v1_CountAvailableTablesRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_CountAvailableTablesResponse__Output>): grpc.ClientUnaryCall;
  countAvailableTables(argument: _seats_tableavailability_v1_CountAvailableTablesRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_tableavailability_v1_CountAvailableTablesResponse__Output>): grpc.ClientUnaryCall;
  countAvailableTables(argument: _seats_tableavailability_v1_CountAvailableTablesRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_CountAvailableTablesResponse__Output>): grpc.ClientUnaryCall;
  countAvailableTables(argument: _seats_tableavailability_v1_CountAvailableTablesRequest, callback: grpc.requestCallback<_seats_tableavailability_v1_CountAvailableTablesResponse__Output>): grpc.ClientUnaryCall;
  
  GetRoundTableStatus(argument: _seats_tableavailability_v1_RoundRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_RoundTableStatus__Output>): grpc.ClientUnaryCall;
  GetRoundTableStatus(argument: _seats_tableavailability_v1_RoundRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_tableavailability_v1_RoundTableStatus__Output>): grpc.ClientUnaryCall;
  GetRoundTableStatus(argument: _seats_tableavailability_v1_RoundRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_RoundTableStatus__Output>): grpc.ClientUnaryCall;
  GetRoundTableStatus(argument: _seats_tableavailability_v1_RoundRef, callback: grpc.requestCallback<_seats_tableavailability_v1_RoundTableStatus__Output>): grpc.ClientUnaryCall;
  getRoundTableStatus(argument: _seats_tableavailability_v1_RoundRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_RoundTableStatus__Output>): grpc.ClientUnaryCall;
  getRoundTableStatus(argument: _seats_tableavailability_v1_RoundRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_tableavailability_v1_RoundTableStatus__Output>): grpc.ClientUnaryCall;
  getRoundTableStatus(argument: _seats_tableavailability_v1_RoundRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_RoundTableStatus__Output>): grpc.ClientUnaryCall;
  getRoundTableStatus(argument: _seats_tableavailability_v1_RoundRef, callback: grpc.requestCallback<_seats_tableavailability_v1_RoundTableStatus__Output>): grpc.ClientUnaryCall;
  
  HoldTable(argument: _seats_tableavailability_v1_HoldTableRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  HoldTable(argument: _seats_tableavailability_v1_HoldTableRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  HoldTable(argument: _seats_tableavailability_v1_HoldTableRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  HoldTable(argument: _seats_tableavailability_v1_HoldTableRequest, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  holdTable(argument: _seats_tableavailability_v1_HoldTableRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  holdTable(argument: _seats_tableavailability_v1_HoldTableRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  holdTable(argument: _seats_tableavailability_v1_HoldTableRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  holdTable(argument: _seats_tableavailability_v1_HoldTableRequest, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  
  InitializeRoundTableStatus(argument: _seats_tableavailability_v1_InitializeRoundTableStatusRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_RoundTableStatus__Output>): grpc.ClientUnaryCall;
  InitializeRoundTableStatus(argument: _seats_tableavailability_v1_InitializeRoundTableStatusRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_tableavailability_v1_RoundTableStatus__Output>): grpc.ClientUnaryCall;
  InitializeRoundTableStatus(argument: _seats_tableavailability_v1_InitializeRoundTableStatusRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_RoundTableStatus__Output>): grpc.ClientUnaryCall;
  InitializeRoundTableStatus(argument: _seats_tableavailability_v1_InitializeRoundTableStatusRequest, callback: grpc.requestCallback<_seats_tableavailability_v1_RoundTableStatus__Output>): grpc.ClientUnaryCall;
  initializeRoundTableStatus(argument: _seats_tableavailability_v1_InitializeRoundTableStatusRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_RoundTableStatus__Output>): grpc.ClientUnaryCall;
  initializeRoundTableStatus(argument: _seats_tableavailability_v1_InitializeRoundTableStatusRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_tableavailability_v1_RoundTableStatus__Output>): grpc.ClientUnaryCall;
  initializeRoundTableStatus(argument: _seats_tableavailability_v1_InitializeRoundTableStatusRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_RoundTableStatus__Output>): grpc.ClientUnaryCall;
  initializeRoundTableStatus(argument: _seats_tableavailability_v1_InitializeRoundTableStatusRequest, callback: grpc.requestCallback<_seats_tableavailability_v1_RoundTableStatus__Output>): grpc.ClientUnaryCall;
  
  MarkTableBooked(argument: _seats_tableavailability_v1_TableRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  MarkTableBooked(argument: _seats_tableavailability_v1_TableRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  MarkTableBooked(argument: _seats_tableavailability_v1_TableRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  MarkTableBooked(argument: _seats_tableavailability_v1_TableRef, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  markTableBooked(argument: _seats_tableavailability_v1_TableRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  markTableBooked(argument: _seats_tableavailability_v1_TableRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  markTableBooked(argument: _seats_tableavailability_v1_TableRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  markTableBooked(argument: _seats_tableavailability_v1_TableRef, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  
  MarkTableOccupied(argument: _seats_tableavailability_v1_TableRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  MarkTableOccupied(argument: _seats_tableavailability_v1_TableRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  MarkTableOccupied(argument: _seats_tableavailability_v1_TableRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  MarkTableOccupied(argument: _seats_tableavailability_v1_TableRef, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  markTableOccupied(argument: _seats_tableavailability_v1_TableRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  markTableOccupied(argument: _seats_tableavailability_v1_TableRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  markTableOccupied(argument: _seats_tableavailability_v1_TableRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  markTableOccupied(argument: _seats_tableavailability_v1_TableRef, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  
  ReleaseHold(argument: _seats_tableavailability_v1_TableRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  ReleaseHold(argument: _seats_tableavailability_v1_TableRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  ReleaseHold(argument: _seats_tableavailability_v1_TableRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  ReleaseHold(argument: _seats_tableavailability_v1_TableRef, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  releaseHold(argument: _seats_tableavailability_v1_TableRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  releaseHold(argument: _seats_tableavailability_v1_TableRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  releaseHold(argument: _seats_tableavailability_v1_TableRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  releaseHold(argument: _seats_tableavailability_v1_TableRef, callback: grpc.requestCallback<_seats_tableavailability_v1_TableStatus__Output>): grpc.ClientUnaryCall;
  
  RemoveRoundTableStatus(argument: _seats_tableavailability_v1_RoundRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_RemoveRoundTableStatusResponse__Output>): grpc.ClientUnaryCall;
  RemoveRoundTableStatus(argument: _seats_tableavailability_v1_RoundRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_tableavailability_v1_RemoveRoundTableStatusResponse__Output>): grpc.ClientUnaryCall;
  RemoveRoundTableStatus(argument: _seats_tableavailability_v1_RoundRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_RemoveRoundTableStatusResponse__Output>): grpc.ClientUnaryCall;
  RemoveRoundTableStatus(argument: _seats_tableavailability_v1_RoundRef, callback: grpc.requestCallback<_seats_tableavailability_v1_RemoveRoundTableStatusResponse__Output>): grpc.ClientUnaryCall;
  removeRoundTableStatus(argument: _seats_tableavailability_v1_RoundRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_RemoveRoundTableStatusResponse__Output>): grpc.ClientUnaryCall;
  removeRoundTableStatus(argument: _seats_tableavailability_v1_RoundRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_tableavailability_v1_RemoveRoundTableStatusResponse__Output>): grpc.ClientUnaryCall;
  removeRoundTableStatus(argument: _seats_tableavailability_v1_RoundRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_tableavailability_v1_RemoveRoundTableStatusResponse__Output>): grpc.ClientUnaryCall;
  removeRoundTableStatus(argument: _seats_tableavailability_v1_RoundRef, callback: grpc.requestCallback<_seats_tableavailability_v1_RemoveRoundTableStatusResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface TableAvailabilityHandlers extends grpc.UntypedServiceImplementation {
  CountAvailableTables: grpc.handleUnaryCall<_seats_tableavailability_v1_CountAvailableTablesRequest__Output, _seats_tableavailability_v1_CountAvailableTablesResponse>;
  
  GetRoundTableStatus: grpc.handleUnaryCall<_seats_tableavailability_v1_RoundRef__Output, _seats_tableavailability_v1_RoundTableStatus>;
  
  HoldTable: grpc.handleUnaryCall<_seats_tableavailability_v1_HoldTableRequest__Output, _seats_tableavailability_v1_TableStatus>;
  
  InitializeRoundTableStatus: grpc.handleUnaryCall<_seats_tableavailability_v1_InitializeRoundTableStatusRequest__Output, _seats_tableavailability_v1_RoundTableStatus>;
  
  MarkTableBooked: grpc.handleUnaryCall<_seats_tableavailability_v1_TableRef__Output, _seats_tableavailability_v1_TableStatus>;
  
  MarkTableOccupied: grpc.handleUnaryCall<_seats_tableavailability_v1_TableRef__Output, _seats_tableavailability_v1_TableStatus>;
  
  ReleaseHold: grpc.handleUnaryCall<_seats_tableavailability_v1_TableRef__Output, _seats_tableavailability_v1_TableStatus>;
  
  RemoveRoundTableStatus: grpc.handleUnaryCall<_seats_tableavailability_v1_RoundRef__Output, _seats_tableavailability_v1_RemoveRoundTableStatusResponse>;
  
}

export interface TableAvailabilityDefinition extends grpc.ServiceDefinition {
  CountAvailableTables: MethodDefinition<_seats_tableavailability_v1_CountAvailableTablesRequest, _seats_tableavailability_v1_CountAvailableTablesResponse, _seats_tableavailability_v1_CountAvailableTablesRequest__Output, _seats_tableavailability_v1_CountAvailableTablesResponse__Output>
  GetRoundTableStatus: MethodDefinition<_seats_tableavailability_v1_RoundRef, _seats_tableavailability_v1_RoundTableStatus, _seats_tableavailability_v1_RoundRef__Output, _seats_tableavailability_v1_RoundTableStatus__Output>
  HoldTable: MethodDefinition<_seats_tableavailability_v1_HoldTableRequest, _seats_tableavailability_v1_TableStatus, _seats_tableavailability_v1_HoldTableRequest__Output, _seats_tableavailability_v1_TableStatus__Output>
  InitializeRoundTableStatus: MethodDefinition<_seats_tableavailability_v1_InitializeRoundTableStatusRequest, _seats_tableavailability_v1_RoundTableStatus, _seats_tableavailability_v1_InitializeRoundTableStatusRequest__Output, _seats_tableavailability_v1_RoundTableStatus__Output>
  MarkTableBooked: MethodDefinition<_seats_tableavailability_v1_TableRef, _seats_tableavailability_v1_TableStatus, _seats_tableavailability_v1_TableRef__Output, _seats_tableavailability_v1_TableStatus__Output>
  MarkTableOccupied: MethodDefinition<_seats_tableavailability_v1_TableRef, _seats_tableavailability_v1_TableStatus, _seats_tableavailability_v1_TableRef__Output, _seats_tableavailability_v1_TableStatus__Output>
  ReleaseHold: MethodDefinition<_seats_tableavailability_v1_TableRef, _seats_tableavailability_v1_TableStatus, _seats_tableavailability_v1_TableRef__Output, _seats_tableavailability_v1_TableStatus__Output>
  RemoveRoundTableStatus: MethodDefinition<_seats_tableavailability_v1_RoundRef, _seats_tableavailability_v1_RemoveRoundTableStatusResponse, _seats_tableavailability_v1_RoundRef__Output, _seats_tableavailability_v1_RemoveRoundTableStatusResponse__Output>
}
