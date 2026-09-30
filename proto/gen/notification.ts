import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { NotificationClient as _seats_notification_v1_NotificationClient, NotificationDefinition as _seats_notification_v1_NotificationDefinition } from './seats/notification/v1/Notification';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  seats: {
    notification: {
      v1: {
        Notification: SubtypeConstructor<typeof grpc.Client, _seats_notification_v1_NotificationClient> & { service: _seats_notification_v1_NotificationDefinition }
        NotificationRequest: MessageTypeDefinition
        NotificationResult: MessageTypeDefinition
      }
    }
  }
}

