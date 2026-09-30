// Original file: proto/staff_account.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { CreateStaffAccountRequest as _seats_staffaccount_v1_CreateStaffAccountRequest, CreateStaffAccountRequest__Output as _seats_staffaccount_v1_CreateStaffAccountRequest__Output } from '../../../seats/staffaccount/v1/CreateStaffAccountRequest';
import type { Credentials as _seats_staffaccount_v1_Credentials, Credentials__Output as _seats_staffaccount_v1_Credentials__Output } from '../../../seats/staffaccount/v1/Credentials';
import type { Empty as _seats_staffaccount_v1_Empty, Empty__Output as _seats_staffaccount_v1_Empty__Output } from '../../../seats/staffaccount/v1/Empty';
import type { Session as _seats_staffaccount_v1_Session, Session__Output as _seats_staffaccount_v1_Session__Output } from '../../../seats/staffaccount/v1/Session';
import type { SessionRef as _seats_staffaccount_v1_SessionRef, SessionRef__Output as _seats_staffaccount_v1_SessionRef__Output } from '../../../seats/staffaccount/v1/SessionRef';
import type { StaffAccount as _seats_staffaccount_v1_StaffAccount, StaffAccount__Output as _seats_staffaccount_v1_StaffAccount__Output } from '../../../seats/staffaccount/v1/StaffAccount';
import type { StaffAccountList as _seats_staffaccount_v1_StaffAccountList, StaffAccountList__Output as _seats_staffaccount_v1_StaffAccountList__Output } from '../../../seats/staffaccount/v1/StaffAccountList';
import type { StaffAccountRef as _seats_staffaccount_v1_StaffAccountRef, StaffAccountRef__Output as _seats_staffaccount_v1_StaffAccountRef__Output } from '../../../seats/staffaccount/v1/StaffAccountRef';
import type { UpdateStaffAccountRequest as _seats_staffaccount_v1_UpdateStaffAccountRequest, UpdateStaffAccountRequest__Output as _seats_staffaccount_v1_UpdateStaffAccountRequest__Output } from '../../../seats/staffaccount/v1/UpdateStaffAccountRequest';

export interface StaffAccountsClient extends grpc.Client {
  CreateStaffAccount(argument: _seats_staffaccount_v1_CreateStaffAccountRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  CreateStaffAccount(argument: _seats_staffaccount_v1_CreateStaffAccountRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  CreateStaffAccount(argument: _seats_staffaccount_v1_CreateStaffAccountRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  CreateStaffAccount(argument: _seats_staffaccount_v1_CreateStaffAccountRequest, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  createStaffAccount(argument: _seats_staffaccount_v1_CreateStaffAccountRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  createStaffAccount(argument: _seats_staffaccount_v1_CreateStaffAccountRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  createStaffAccount(argument: _seats_staffaccount_v1_CreateStaffAccountRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  createStaffAccount(argument: _seats_staffaccount_v1_CreateStaffAccountRequest, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  
  DisableStaffAccount(argument: _seats_staffaccount_v1_StaffAccountRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  DisableStaffAccount(argument: _seats_staffaccount_v1_StaffAccountRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  DisableStaffAccount(argument: _seats_staffaccount_v1_StaffAccountRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  DisableStaffAccount(argument: _seats_staffaccount_v1_StaffAccountRef, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  disableStaffAccount(argument: _seats_staffaccount_v1_StaffAccountRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  disableStaffAccount(argument: _seats_staffaccount_v1_StaffAccountRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  disableStaffAccount(argument: _seats_staffaccount_v1_StaffAccountRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  disableStaffAccount(argument: _seats_staffaccount_v1_StaffAccountRef, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  
  ListStaffAccounts(argument: _seats_staffaccount_v1_Empty, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccountList__Output>): grpc.ClientUnaryCall;
  ListStaffAccounts(argument: _seats_staffaccount_v1_Empty, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccountList__Output>): grpc.ClientUnaryCall;
  ListStaffAccounts(argument: _seats_staffaccount_v1_Empty, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccountList__Output>): grpc.ClientUnaryCall;
  ListStaffAccounts(argument: _seats_staffaccount_v1_Empty, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccountList__Output>): grpc.ClientUnaryCall;
  listStaffAccounts(argument: _seats_staffaccount_v1_Empty, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccountList__Output>): grpc.ClientUnaryCall;
  listStaffAccounts(argument: _seats_staffaccount_v1_Empty, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccountList__Output>): grpc.ClientUnaryCall;
  listStaffAccounts(argument: _seats_staffaccount_v1_Empty, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccountList__Output>): grpc.ClientUnaryCall;
  listStaffAccounts(argument: _seats_staffaccount_v1_Empty, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccountList__Output>): grpc.ClientUnaryCall;
  
  SignIn(argument: _seats_staffaccount_v1_Credentials, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_Session__Output>): grpc.ClientUnaryCall;
  SignIn(argument: _seats_staffaccount_v1_Credentials, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_staffaccount_v1_Session__Output>): grpc.ClientUnaryCall;
  SignIn(argument: _seats_staffaccount_v1_Credentials, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_Session__Output>): grpc.ClientUnaryCall;
  SignIn(argument: _seats_staffaccount_v1_Credentials, callback: grpc.requestCallback<_seats_staffaccount_v1_Session__Output>): grpc.ClientUnaryCall;
  signIn(argument: _seats_staffaccount_v1_Credentials, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_Session__Output>): grpc.ClientUnaryCall;
  signIn(argument: _seats_staffaccount_v1_Credentials, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_staffaccount_v1_Session__Output>): grpc.ClientUnaryCall;
  signIn(argument: _seats_staffaccount_v1_Credentials, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_Session__Output>): grpc.ClientUnaryCall;
  signIn(argument: _seats_staffaccount_v1_Credentials, callback: grpc.requestCallback<_seats_staffaccount_v1_Session__Output>): grpc.ClientUnaryCall;
  
  SignOut(argument: _seats_staffaccount_v1_SessionRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_Empty__Output>): grpc.ClientUnaryCall;
  SignOut(argument: _seats_staffaccount_v1_SessionRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_staffaccount_v1_Empty__Output>): grpc.ClientUnaryCall;
  SignOut(argument: _seats_staffaccount_v1_SessionRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_Empty__Output>): grpc.ClientUnaryCall;
  SignOut(argument: _seats_staffaccount_v1_SessionRef, callback: grpc.requestCallback<_seats_staffaccount_v1_Empty__Output>): grpc.ClientUnaryCall;
  signOut(argument: _seats_staffaccount_v1_SessionRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_Empty__Output>): grpc.ClientUnaryCall;
  signOut(argument: _seats_staffaccount_v1_SessionRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_staffaccount_v1_Empty__Output>): grpc.ClientUnaryCall;
  signOut(argument: _seats_staffaccount_v1_SessionRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_Empty__Output>): grpc.ClientUnaryCall;
  signOut(argument: _seats_staffaccount_v1_SessionRef, callback: grpc.requestCallback<_seats_staffaccount_v1_Empty__Output>): grpc.ClientUnaryCall;
  
  UpdateStaffAccount(argument: _seats_staffaccount_v1_UpdateStaffAccountRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  UpdateStaffAccount(argument: _seats_staffaccount_v1_UpdateStaffAccountRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  UpdateStaffAccount(argument: _seats_staffaccount_v1_UpdateStaffAccountRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  UpdateStaffAccount(argument: _seats_staffaccount_v1_UpdateStaffAccountRequest, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  updateStaffAccount(argument: _seats_staffaccount_v1_UpdateStaffAccountRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  updateStaffAccount(argument: _seats_staffaccount_v1_UpdateStaffAccountRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  updateStaffAccount(argument: _seats_staffaccount_v1_UpdateStaffAccountRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  updateStaffAccount(argument: _seats_staffaccount_v1_UpdateStaffAccountRequest, callback: grpc.requestCallback<_seats_staffaccount_v1_StaffAccount__Output>): grpc.ClientUnaryCall;
  
}

export interface StaffAccountsHandlers extends grpc.UntypedServiceImplementation {
  CreateStaffAccount: grpc.handleUnaryCall<_seats_staffaccount_v1_CreateStaffAccountRequest__Output, _seats_staffaccount_v1_StaffAccount>;
  
  DisableStaffAccount: grpc.handleUnaryCall<_seats_staffaccount_v1_StaffAccountRef__Output, _seats_staffaccount_v1_StaffAccount>;
  
  ListStaffAccounts: grpc.handleUnaryCall<_seats_staffaccount_v1_Empty__Output, _seats_staffaccount_v1_StaffAccountList>;
  
  SignIn: grpc.handleUnaryCall<_seats_staffaccount_v1_Credentials__Output, _seats_staffaccount_v1_Session>;
  
  SignOut: grpc.handleUnaryCall<_seats_staffaccount_v1_SessionRef__Output, _seats_staffaccount_v1_Empty>;
  
  UpdateStaffAccount: grpc.handleUnaryCall<_seats_staffaccount_v1_UpdateStaffAccountRequest__Output, _seats_staffaccount_v1_StaffAccount>;
  
}

export interface StaffAccountsDefinition extends grpc.ServiceDefinition {
  CreateStaffAccount: MethodDefinition<_seats_staffaccount_v1_CreateStaffAccountRequest, _seats_staffaccount_v1_StaffAccount, _seats_staffaccount_v1_CreateStaffAccountRequest__Output, _seats_staffaccount_v1_StaffAccount__Output>
  DisableStaffAccount: MethodDefinition<_seats_staffaccount_v1_StaffAccountRef, _seats_staffaccount_v1_StaffAccount, _seats_staffaccount_v1_StaffAccountRef__Output, _seats_staffaccount_v1_StaffAccount__Output>
  ListStaffAccounts: MethodDefinition<_seats_staffaccount_v1_Empty, _seats_staffaccount_v1_StaffAccountList, _seats_staffaccount_v1_Empty__Output, _seats_staffaccount_v1_StaffAccountList__Output>
  SignIn: MethodDefinition<_seats_staffaccount_v1_Credentials, _seats_staffaccount_v1_Session, _seats_staffaccount_v1_Credentials__Output, _seats_staffaccount_v1_Session__Output>
  SignOut: MethodDefinition<_seats_staffaccount_v1_SessionRef, _seats_staffaccount_v1_Empty, _seats_staffaccount_v1_SessionRef__Output, _seats_staffaccount_v1_Empty__Output>
  UpdateStaffAccount: MethodDefinition<_seats_staffaccount_v1_UpdateStaffAccountRequest, _seats_staffaccount_v1_StaffAccount, _seats_staffaccount_v1_UpdateStaffAccountRequest__Output, _seats_staffaccount_v1_StaffAccount__Output>
}
