import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { PaymentClient as _seats_payment_v1_PaymentClient, PaymentDefinition as _seats_payment_v1_PaymentDefinition } from './seats/payment/v1/Payment';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  seats: {
    payment: {
      v1: {
        CreatePaymentRequestRequest: MessageTypeDefinition
        Payment: SubtypeConstructor<typeof grpc.Client, _seats_payment_v1_PaymentClient> & { service: _seats_payment_v1_PaymentDefinition }
        PaymentRef: MessageTypeDefinition
        PaymentRequest: MessageTypeDefinition
        PaymentResult: MessageTypeDefinition
        PaymentResultAck: MessageTypeDefinition
        PaymentStatus: MessageTypeDefinition
      }
    }
  }
}

