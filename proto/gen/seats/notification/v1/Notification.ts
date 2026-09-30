// Original file: proto/notification.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { NotificationRequest as _seats_notification_v1_NotificationRequest, NotificationRequest__Output as _seats_notification_v1_NotificationRequest__Output } from '../../../seats/notification/v1/NotificationRequest';
import type { NotificationResult as _seats_notification_v1_NotificationResult, NotificationResult__Output as _seats_notification_v1_NotificationResult__Output } from '../../../seats/notification/v1/NotificationResult';

export interface NotificationClient extends grpc.Client {
  SendBookingConfirmation(argument: _seats_notification_v1_NotificationRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  SendBookingConfirmation(argument: _seats_notification_v1_NotificationRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  SendBookingConfirmation(argument: _seats_notification_v1_NotificationRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  SendBookingConfirmation(argument: _seats_notification_v1_NotificationRequest, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  sendBookingConfirmation(argument: _seats_notification_v1_NotificationRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  sendBookingConfirmation(argument: _seats_notification_v1_NotificationRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  sendBookingConfirmation(argument: _seats_notification_v1_NotificationRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  sendBookingConfirmation(argument: _seats_notification_v1_NotificationRequest, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  
  SendHoldExpiredNotice(argument: _seats_notification_v1_NotificationRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  SendHoldExpiredNotice(argument: _seats_notification_v1_NotificationRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  SendHoldExpiredNotice(argument: _seats_notification_v1_NotificationRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  SendHoldExpiredNotice(argument: _seats_notification_v1_NotificationRequest, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  sendHoldExpiredNotice(argument: _seats_notification_v1_NotificationRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  sendHoldExpiredNotice(argument: _seats_notification_v1_NotificationRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  sendHoldExpiredNotice(argument: _seats_notification_v1_NotificationRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  sendHoldExpiredNotice(argument: _seats_notification_v1_NotificationRequest, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  
  SendPaymentFailedNotice(argument: _seats_notification_v1_NotificationRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  SendPaymentFailedNotice(argument: _seats_notification_v1_NotificationRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  SendPaymentFailedNotice(argument: _seats_notification_v1_NotificationRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  SendPaymentFailedNotice(argument: _seats_notification_v1_NotificationRequest, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  sendPaymentFailedNotice(argument: _seats_notification_v1_NotificationRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  sendPaymentFailedNotice(argument: _seats_notification_v1_NotificationRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  sendPaymentFailedNotice(argument: _seats_notification_v1_NotificationRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  sendPaymentFailedNotice(argument: _seats_notification_v1_NotificationRequest, callback: grpc.requestCallback<_seats_notification_v1_NotificationResult__Output>): grpc.ClientUnaryCall;
  
}

export interface NotificationHandlers extends grpc.UntypedServiceImplementation {
  SendBookingConfirmation: grpc.handleUnaryCall<_seats_notification_v1_NotificationRequest__Output, _seats_notification_v1_NotificationResult>;
  
  SendHoldExpiredNotice: grpc.handleUnaryCall<_seats_notification_v1_NotificationRequest__Output, _seats_notification_v1_NotificationResult>;
  
  SendPaymentFailedNotice: grpc.handleUnaryCall<_seats_notification_v1_NotificationRequest__Output, _seats_notification_v1_NotificationResult>;
  
}

export interface NotificationDefinition extends grpc.ServiceDefinition {
  SendBookingConfirmation: MethodDefinition<_seats_notification_v1_NotificationRequest, _seats_notification_v1_NotificationResult, _seats_notification_v1_NotificationRequest__Output, _seats_notification_v1_NotificationResult__Output>
  SendHoldExpiredNotice: MethodDefinition<_seats_notification_v1_NotificationRequest, _seats_notification_v1_NotificationResult, _seats_notification_v1_NotificationRequest__Output, _seats_notification_v1_NotificationResult__Output>
  SendPaymentFailedNotice: MethodDefinition<_seats_notification_v1_NotificationRequest, _seats_notification_v1_NotificationResult, _seats_notification_v1_NotificationRequest__Output, _seats_notification_v1_NotificationResult__Output>
}
