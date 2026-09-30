import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { TableAvailabilityClient as _seats_tableavailability_v1_TableAvailabilityClient, TableAvailabilityDefinition as _seats_tableavailability_v1_TableAvailabilityDefinition } from './seats/tableavailability/v1/TableAvailability';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  seats: {
    tableavailability: {
      v1: {
        CountAvailableTablesRequest: MessageTypeDefinition
        CountAvailableTablesResponse: MessageTypeDefinition
        CreateRoundTableStatusRequest: MessageTypeDefinition
        HoldTableRequest: MessageTypeDefinition
        InitialTable: MessageTypeDefinition
        RemoveRoundTableStatusResponse: MessageTypeDefinition
        RoundCount: MessageTypeDefinition
        RoundRef: MessageTypeDefinition
        RoundTableStatus: MessageTypeDefinition
        TableAvailability: SubtypeConstructor<typeof grpc.Client, _seats_tableavailability_v1_TableAvailabilityClient> & { service: _seats_tableavailability_v1_TableAvailabilityDefinition }
        TableRef: MessageTypeDefinition
        TableStatus: MessageTypeDefinition
      }
    }
  }
}

