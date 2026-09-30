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
        CheckInWindow: MessageTypeDefinition
        ConcertRound: SubtypeConstructor<typeof grpc.Client, _seats_concertround_v1_ConcertRoundClient> & { service: _seats_concertround_v1_ConcertRoundDefinition }
        GetCheckInWindowRequest: MessageTypeDefinition
        GetRoundPricingRequest: MessageTypeDefinition
        GetRoundRequest: MessageTypeDefinition
        PackagePrice: MessageTypeDefinition
        Round: MessageTypeDefinition
        RoundPricing: MessageTypeDefinition
        RoundTable: MessageTypeDefinition
      }
    }
  }
}

