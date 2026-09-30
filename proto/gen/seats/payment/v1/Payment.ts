// Original file: proto/payment.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { CreatePaymentRequestRequest as _seats_payment_v1_CreatePaymentRequestRequest, CreatePaymentRequestRequest__Output as _seats_payment_v1_CreatePaymentRequestRequest__Output } from '../../../seats/payment/v1/CreatePaymentRequestRequest';
import type { PaymentRef as _seats_payment_v1_PaymentRef, PaymentRef__Output as _seats_payment_v1_PaymentRef__Output } from '../../../seats/payment/v1/PaymentRef';
import type { PaymentRequest as _seats_payment_v1_PaymentRequest, PaymentRequest__Output as _seats_payment_v1_PaymentRequest__Output } from '../../../seats/payment/v1/PaymentRequest';
import type { PaymentResult as _seats_payment_v1_PaymentResult, PaymentResult__Output as _seats_payment_v1_PaymentResult__Output } from '../../../seats/payment/v1/PaymentResult';
import type { PaymentResultAck as _seats_payment_v1_PaymentResultAck, PaymentResultAck__Output as _seats_payment_v1_PaymentResultAck__Output } from '../../../seats/payment/v1/PaymentResultAck';
import type { PaymentStatus as _seats_payment_v1_PaymentStatus, PaymentStatus__Output as _seats_payment_v1_PaymentStatus__Output } from '../../../seats/payment/v1/PaymentStatus';

export interface PaymentClient extends grpc.Client {
  CreatePaymentRequest(argument: _seats_payment_v1_CreatePaymentRequestRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_payment_v1_PaymentRequest__Output>): grpc.ClientUnaryCall;
  CreatePaymentRequest(argument: _seats_payment_v1_CreatePaymentRequestRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_payment_v1_PaymentRequest__Output>): grpc.ClientUnaryCall;
  CreatePaymentRequest(argument: _seats_payment_v1_CreatePaymentRequestRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_payment_v1_PaymentRequest__Output>): grpc.ClientUnaryCall;
  CreatePaymentRequest(argument: _seats_payment_v1_CreatePaymentRequestRequest, callback: grpc.requestCallback<_seats_payment_v1_PaymentRequest__Output>): grpc.ClientUnaryCall;
  createPaymentRequest(argument: _seats_payment_v1_CreatePaymentRequestRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_payment_v1_PaymentRequest__Output>): grpc.ClientUnaryCall;
  createPaymentRequest(argument: _seats_payment_v1_CreatePaymentRequestRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_payment_v1_PaymentRequest__Output>): grpc.ClientUnaryCall;
  createPaymentRequest(argument: _seats_payment_v1_CreatePaymentRequestRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_payment_v1_PaymentRequest__Output>): grpc.ClientUnaryCall;
  createPaymentRequest(argument: _seats_payment_v1_CreatePaymentRequestRequest, callback: grpc.requestCallback<_seats_payment_v1_PaymentRequest__Output>): grpc.ClientUnaryCall;
  
  GetPaymentStatus(argument: _seats_payment_v1_PaymentRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_payment_v1_PaymentStatus__Output>): grpc.ClientUnaryCall;
  GetPaymentStatus(argument: _seats_payment_v1_PaymentRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_payment_v1_PaymentStatus__Output>): grpc.ClientUnaryCall;
  GetPaymentStatus(argument: _seats_payment_v1_PaymentRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_payment_v1_PaymentStatus__Output>): grpc.ClientUnaryCall;
  GetPaymentStatus(argument: _seats_payment_v1_PaymentRef, callback: grpc.requestCallback<_seats_payment_v1_PaymentStatus__Output>): grpc.ClientUnaryCall;
  getPaymentStatus(argument: _seats_payment_v1_PaymentRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_payment_v1_PaymentStatus__Output>): grpc.ClientUnaryCall;
  getPaymentStatus(argument: _seats_payment_v1_PaymentRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_payment_v1_PaymentStatus__Output>): grpc.ClientUnaryCall;
  getPaymentStatus(argument: _seats_payment_v1_PaymentRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_payment_v1_PaymentStatus__Output>): grpc.ClientUnaryCall;
  getPaymentStatus(argument: _seats_payment_v1_PaymentRef, callback: grpc.requestCallback<_seats_payment_v1_PaymentStatus__Output>): grpc.ClientUnaryCall;
  
  ReceivePaymentResult(argument: _seats_payment_v1_PaymentResult, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_payment_v1_PaymentResultAck__Output>): grpc.ClientUnaryCall;
  ReceivePaymentResult(argument: _seats_payment_v1_PaymentResult, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_payment_v1_PaymentResultAck__Output>): grpc.ClientUnaryCall;
  ReceivePaymentResult(argument: _seats_payment_v1_PaymentResult, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_payment_v1_PaymentResultAck__Output>): grpc.ClientUnaryCall;
  ReceivePaymentResult(argument: _seats_payment_v1_PaymentResult, callback: grpc.requestCallback<_seats_payment_v1_PaymentResultAck__Output>): grpc.ClientUnaryCall;
  receivePaymentResult(argument: _seats_payment_v1_PaymentResult, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_payment_v1_PaymentResultAck__Output>): grpc.ClientUnaryCall;
  receivePaymentResult(argument: _seats_payment_v1_PaymentResult, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_payment_v1_PaymentResultAck__Output>): grpc.ClientUnaryCall;
  receivePaymentResult(argument: _seats_payment_v1_PaymentResult, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_payment_v1_PaymentResultAck__Output>): grpc.ClientUnaryCall;
  receivePaymentResult(argument: _seats_payment_v1_PaymentResult, callback: grpc.requestCallback<_seats_payment_v1_PaymentResultAck__Output>): grpc.ClientUnaryCall;
  
}

export interface PaymentHandlers extends grpc.UntypedServiceImplementation {
  CreatePaymentRequest: grpc.handleUnaryCall<_seats_payment_v1_CreatePaymentRequestRequest__Output, _seats_payment_v1_PaymentRequest>;
  
  GetPaymentStatus: grpc.handleUnaryCall<_seats_payment_v1_PaymentRef__Output, _seats_payment_v1_PaymentStatus>;
  
  ReceivePaymentResult: grpc.handleUnaryCall<_seats_payment_v1_PaymentResult__Output, _seats_payment_v1_PaymentResultAck>;
  
}

export interface PaymentDefinition extends grpc.ServiceDefinition {
  CreatePaymentRequest: MethodDefinition<_seats_payment_v1_CreatePaymentRequestRequest, _seats_payment_v1_PaymentRequest, _seats_payment_v1_CreatePaymentRequestRequest__Output, _seats_payment_v1_PaymentRequest__Output>
  GetPaymentStatus: MethodDefinition<_seats_payment_v1_PaymentRef, _seats_payment_v1_PaymentStatus, _seats_payment_v1_PaymentRef__Output, _seats_payment_v1_PaymentStatus__Output>
  ReceivePaymentResult: MethodDefinition<_seats_payment_v1_PaymentResult, _seats_payment_v1_PaymentResultAck, _seats_payment_v1_PaymentResult__Output, _seats_payment_v1_PaymentResultAck__Output>
}
