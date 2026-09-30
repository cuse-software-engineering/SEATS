import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { StaffAccountsClient as _seats_staffaccount_v1_StaffAccountsClient, StaffAccountsDefinition as _seats_staffaccount_v1_StaffAccountsDefinition } from './seats/staffaccount/v1/StaffAccounts';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  seats: {
    staffaccount: {
      v1: {
        CreateStaffAccountRequest: MessageTypeDefinition
        Credentials: MessageTypeDefinition
        Empty: MessageTypeDefinition
        Session: MessageTypeDefinition
        SessionRef: MessageTypeDefinition
        StaffAccount: MessageTypeDefinition
        StaffAccountList: MessageTypeDefinition
        StaffAccountRef: MessageTypeDefinition
        StaffAccounts: SubtypeConstructor<typeof grpc.Client, _seats_staffaccount_v1_StaffAccountsClient> & { service: _seats_staffaccount_v1_StaffAccountsDefinition }
        UpdateStaffAccountRequest: MessageTypeDefinition
      }
    }
  }
}

