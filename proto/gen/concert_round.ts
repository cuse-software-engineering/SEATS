import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { ConcertRoundClient as _seats_concertround_v1_ConcertRoundClient, ConcertRoundDefinition as _seats_concertround_v1_ConcertRoundDefinition } from './seats/concertround/v1/ConcertRound';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  seats: {
    concertround: {
      v1: {
        BusinessParameters: MessageTypeDefinition
        CheckInWindow: MessageTypeDefinition
        ConcertRound: SubtypeConstructor<typeof grpc.Client, _seats_concertround_v1_ConcertRoundClient> & { service: _seats_concertround_v1_ConcertRoundDefinition }
        CreateRoundRequest: MessageTypeDefinition
        CreateZoneMapRequest: MessageTypeDefinition
        DefineTableTypeRequest: MessageTypeDefinition
        Empty: MessageTypeDefinition
        ListZoneMapsRequest: MessageTypeDefinition
        PackagePrice: MessageTypeDefinition
        PackagePrices: MessageTypeDefinition
        Removed: MessageTypeDefinition
        Round: MessageTypeDefinition
        RoundList: MessageTypeDefinition
        RoundPricing: MessageTypeDefinition
        RoundRef: MessageTypeDefinition
        RoundTable: MessageTypeDefinition
        RoundTableList: MessageTypeDefinition
        TableNumbers: MessageTypeDefinition
        TableType: MessageTypeDefinition
        TableTypeList: MessageTypeDefinition
        UpcomingRound: MessageTypeDefinition
        UpcomingRoundList: MessageTypeDefinition
        UpdateBusinessParametersRequest: MessageTypeDefinition
        UpdateRoundRequest: MessageTypeDefinition
        UpdateZoneMapRequest: MessageTypeDefinition
        UploadZoneMapImageRequest: MessageTypeDefinition
        ValidationResult: MessageTypeDefinition
        Zone: MessageTypeDefinition
        ZoneList: MessageTypeDefinition
        ZoneMap: MessageTypeDefinition
        ZoneMapList: MessageTypeDefinition
        ZoneMapRef: MessageTypeDefinition
        ZoneMapSummary: MessageTypeDefinition
        ZoneMapTable: MessageTypeDefinition
        ZoneMapTableList: MessageTypeDefinition
        ZoneSummary: MessageTypeDefinition
      }
    }
  }
}

