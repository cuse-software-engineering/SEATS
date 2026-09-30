// Original file: proto/booking.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { Booking as _seats_booking_v1_Booking, Booking__Output as _seats_booking_v1_Booking__Output } from '../../../seats/booking/v1/Booking';
import type { BookingList as _seats_booking_v1_BookingList, BookingList__Output as _seats_booking_v1_BookingList__Output } from '../../../seats/booking/v1/BookingList';
import type { BookingRef as _seats_booking_v1_BookingRef, BookingRef__Output as _seats_booking_v1_BookingRef__Output } from '../../../seats/booking/v1/BookingRef';
import type { BookingReference as _seats_booking_v1_BookingReference, BookingReference__Output as _seats_booking_v1_BookingReference__Output } from '../../../seats/booking/v1/BookingReference';
import type { BookingTerms as _seats_booking_v1_BookingTerms, BookingTerms__Output as _seats_booking_v1_BookingTerms__Output } from '../../../seats/booking/v1/BookingTerms';
import type { ConfirmBookingPaymentRequest as _seats_booking_v1_ConfirmBookingPaymentRequest, ConfirmBookingPaymentRequest__Output as _seats_booking_v1_ConfirmBookingPaymentRequest__Output } from '../../../seats/booking/v1/ConfirmBookingPaymentRequest';
import type { CreateHeldBookingRequest as _seats_booking_v1_CreateHeldBookingRequest, CreateHeldBookingRequest__Output as _seats_booking_v1_CreateHeldBookingRequest__Output } from '../../../seats/booking/v1/CreateHeldBookingRequest';
import type { CustomerProfile as _seats_booking_v1_CustomerProfile, CustomerProfile__Output as _seats_booking_v1_CustomerProfile__Output } from '../../../seats/booking/v1/CustomerProfile';
import type { CustomerProfileRequest as _seats_booking_v1_CustomerProfileRequest, CustomerProfileRequest__Output as _seats_booking_v1_CustomerProfileRequest__Output } from '../../../seats/booking/v1/CustomerProfileRequest';
import type { ETicket as _seats_booking_v1_ETicket, ETicket__Output as _seats_booking_v1_ETicket__Output } from '../../../seats/booking/v1/ETicket';
import type { Empty as _seats_booking_v1_Empty, Empty__Output as _seats_booking_v1_Empty__Output } from '../../../seats/booking/v1/Empty';
import type { PaymentRequest as _seats_booking_v1_PaymentRequest, PaymentRequest__Output as _seats_booking_v1_PaymentRequest__Output } from '../../../seats/booking/v1/PaymentRequest';
import type { RoundRef as _seats_booking_v1_RoundRef, RoundRef__Output as _seats_booking_v1_RoundRef__Output } from '../../../seats/booking/v1/RoundRef';
import type { SetPartySizeRequest as _seats_booking_v1_SetPartySizeRequest, SetPartySizeRequest__Output as _seats_booking_v1_SetPartySizeRequest__Output } from '../../../seats/booking/v1/SetPartySizeRequest';
import type { VerificationResult as _seats_booking_v1_VerificationResult, VerificationResult__Output as _seats_booking_v1_VerificationResult__Output } from '../../../seats/booking/v1/VerificationResult';

export interface BookingsClient extends grpc.Client {
  AcceptBookingTerms(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  AcceptBookingTerms(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  AcceptBookingTerms(argument: _seats_booking_v1_BookingRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  AcceptBookingTerms(argument: _seats_booking_v1_BookingRef, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  acceptBookingTerms(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  acceptBookingTerms(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  acceptBookingTerms(argument: _seats_booking_v1_BookingRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  acceptBookingTerms(argument: _seats_booking_v1_BookingRef, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  
  CancelBooking(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  CancelBooking(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  CancelBooking(argument: _seats_booking_v1_BookingRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  CancelBooking(argument: _seats_booking_v1_BookingRef, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  cancelBooking(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  cancelBooking(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  cancelBooking(argument: _seats_booking_v1_BookingRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  cancelBooking(argument: _seats_booking_v1_BookingRef, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  
  CheckInBooking(argument: _seats_booking_v1_BookingReference, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  CheckInBooking(argument: _seats_booking_v1_BookingReference, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  CheckInBooking(argument: _seats_booking_v1_BookingReference, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  CheckInBooking(argument: _seats_booking_v1_BookingReference, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  checkInBooking(argument: _seats_booking_v1_BookingReference, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  checkInBooking(argument: _seats_booking_v1_BookingReference, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  checkInBooking(argument: _seats_booking_v1_BookingReference, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  checkInBooking(argument: _seats_booking_v1_BookingReference, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  
  ConfirmBookingPayment(argument: _seats_booking_v1_ConfirmBookingPaymentRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  ConfirmBookingPayment(argument: _seats_booking_v1_ConfirmBookingPaymentRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  ConfirmBookingPayment(argument: _seats_booking_v1_ConfirmBookingPaymentRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  ConfirmBookingPayment(argument: _seats_booking_v1_ConfirmBookingPaymentRequest, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  confirmBookingPayment(argument: _seats_booking_v1_ConfirmBookingPaymentRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  confirmBookingPayment(argument: _seats_booking_v1_ConfirmBookingPaymentRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  confirmBookingPayment(argument: _seats_booking_v1_ConfirmBookingPaymentRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  confirmBookingPayment(argument: _seats_booking_v1_ConfirmBookingPaymentRequest, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  
  CreateCustomerProfile(argument: _seats_booking_v1_CustomerProfileRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  CreateCustomerProfile(argument: _seats_booking_v1_CustomerProfileRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  CreateCustomerProfile(argument: _seats_booking_v1_CustomerProfileRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  CreateCustomerProfile(argument: _seats_booking_v1_CustomerProfileRequest, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  createCustomerProfile(argument: _seats_booking_v1_CustomerProfileRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  createCustomerProfile(argument: _seats_booking_v1_CustomerProfileRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  createCustomerProfile(argument: _seats_booking_v1_CustomerProfileRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  createCustomerProfile(argument: _seats_booking_v1_CustomerProfileRequest, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  
  CreateHeldBooking(argument: _seats_booking_v1_CreateHeldBookingRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  CreateHeldBooking(argument: _seats_booking_v1_CreateHeldBookingRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  CreateHeldBooking(argument: _seats_booking_v1_CreateHeldBookingRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  CreateHeldBooking(argument: _seats_booking_v1_CreateHeldBookingRequest, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  createHeldBooking(argument: _seats_booking_v1_CreateHeldBookingRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  createHeldBooking(argument: _seats_booking_v1_CreateHeldBookingRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  createHeldBooking(argument: _seats_booking_v1_CreateHeldBookingRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  createHeldBooking(argument: _seats_booking_v1_CreateHeldBookingRequest, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  
  GetBooking(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  GetBooking(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  GetBooking(argument: _seats_booking_v1_BookingRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  GetBooking(argument: _seats_booking_v1_BookingRef, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  getBooking(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  getBooking(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  getBooking(argument: _seats_booking_v1_BookingRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  getBooking(argument: _seats_booking_v1_BookingRef, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  
  GetBookingTerms(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_BookingTerms__Output>): grpc.ClientUnaryCall;
  GetBookingTerms(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_BookingTerms__Output>): grpc.ClientUnaryCall;
  GetBookingTerms(argument: _seats_booking_v1_BookingRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_BookingTerms__Output>): grpc.ClientUnaryCall;
  GetBookingTerms(argument: _seats_booking_v1_BookingRef, callback: grpc.requestCallback<_seats_booking_v1_BookingTerms__Output>): grpc.ClientUnaryCall;
  getBookingTerms(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_BookingTerms__Output>): grpc.ClientUnaryCall;
  getBookingTerms(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_BookingTerms__Output>): grpc.ClientUnaryCall;
  getBookingTerms(argument: _seats_booking_v1_BookingRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_BookingTerms__Output>): grpc.ClientUnaryCall;
  getBookingTerms(argument: _seats_booking_v1_BookingRef, callback: grpc.requestCallback<_seats_booking_v1_BookingTerms__Output>): grpc.ClientUnaryCall;
  
  GetCustomerBookings(argument: _seats_booking_v1_Empty, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_BookingList__Output>): grpc.ClientUnaryCall;
  GetCustomerBookings(argument: _seats_booking_v1_Empty, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_BookingList__Output>): grpc.ClientUnaryCall;
  GetCustomerBookings(argument: _seats_booking_v1_Empty, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_BookingList__Output>): grpc.ClientUnaryCall;
  GetCustomerBookings(argument: _seats_booking_v1_Empty, callback: grpc.requestCallback<_seats_booking_v1_BookingList__Output>): grpc.ClientUnaryCall;
  getCustomerBookings(argument: _seats_booking_v1_Empty, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_BookingList__Output>): grpc.ClientUnaryCall;
  getCustomerBookings(argument: _seats_booking_v1_Empty, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_BookingList__Output>): grpc.ClientUnaryCall;
  getCustomerBookings(argument: _seats_booking_v1_Empty, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_BookingList__Output>): grpc.ClientUnaryCall;
  getCustomerBookings(argument: _seats_booking_v1_Empty, callback: grpc.requestCallback<_seats_booking_v1_BookingList__Output>): grpc.ClientUnaryCall;
  
  GetCustomerProfile(argument: _seats_booking_v1_Empty, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  GetCustomerProfile(argument: _seats_booking_v1_Empty, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  GetCustomerProfile(argument: _seats_booking_v1_Empty, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  GetCustomerProfile(argument: _seats_booking_v1_Empty, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  getCustomerProfile(argument: _seats_booking_v1_Empty, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  getCustomerProfile(argument: _seats_booking_v1_Empty, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  getCustomerProfile(argument: _seats_booking_v1_Empty, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  getCustomerProfile(argument: _seats_booking_v1_Empty, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  
  GetETicket(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_ETicket__Output>): grpc.ClientUnaryCall;
  GetETicket(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_ETicket__Output>): grpc.ClientUnaryCall;
  GetETicket(argument: _seats_booking_v1_BookingRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_ETicket__Output>): grpc.ClientUnaryCall;
  GetETicket(argument: _seats_booking_v1_BookingRef, callback: grpc.requestCallback<_seats_booking_v1_ETicket__Output>): grpc.ClientUnaryCall;
  getETicket(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_ETicket__Output>): grpc.ClientUnaryCall;
  getETicket(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_ETicket__Output>): grpc.ClientUnaryCall;
  getETicket(argument: _seats_booking_v1_BookingRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_ETicket__Output>): grpc.ClientUnaryCall;
  getETicket(argument: _seats_booking_v1_BookingRef, callback: grpc.requestCallback<_seats_booking_v1_ETicket__Output>): grpc.ClientUnaryCall;
  
  GetRoundBookings(argument: _seats_booking_v1_RoundRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_BookingList__Output>): grpc.ClientUnaryCall;
  GetRoundBookings(argument: _seats_booking_v1_RoundRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_BookingList__Output>): grpc.ClientUnaryCall;
  GetRoundBookings(argument: _seats_booking_v1_RoundRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_BookingList__Output>): grpc.ClientUnaryCall;
  GetRoundBookings(argument: _seats_booking_v1_RoundRef, callback: grpc.requestCallback<_seats_booking_v1_BookingList__Output>): grpc.ClientUnaryCall;
  getRoundBookings(argument: _seats_booking_v1_RoundRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_BookingList__Output>): grpc.ClientUnaryCall;
  getRoundBookings(argument: _seats_booking_v1_RoundRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_BookingList__Output>): grpc.ClientUnaryCall;
  getRoundBookings(argument: _seats_booking_v1_RoundRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_BookingList__Output>): grpc.ClientUnaryCall;
  getRoundBookings(argument: _seats_booking_v1_RoundRef, callback: grpc.requestCallback<_seats_booking_v1_BookingList__Output>): grpc.ClientUnaryCall;
  
  SetPartySize(argument: _seats_booking_v1_SetPartySizeRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  SetPartySize(argument: _seats_booking_v1_SetPartySizeRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  SetPartySize(argument: _seats_booking_v1_SetPartySizeRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  SetPartySize(argument: _seats_booking_v1_SetPartySizeRequest, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  setPartySize(argument: _seats_booking_v1_SetPartySizeRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  setPartySize(argument: _seats_booking_v1_SetPartySizeRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  setPartySize(argument: _seats_booking_v1_SetPartySizeRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  setPartySize(argument: _seats_booking_v1_SetPartySizeRequest, callback: grpc.requestCallback<_seats_booking_v1_Booking__Output>): grpc.ClientUnaryCall;
  
  StartPayment(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_PaymentRequest__Output>): grpc.ClientUnaryCall;
  StartPayment(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_PaymentRequest__Output>): grpc.ClientUnaryCall;
  StartPayment(argument: _seats_booking_v1_BookingRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_PaymentRequest__Output>): grpc.ClientUnaryCall;
  StartPayment(argument: _seats_booking_v1_BookingRef, callback: grpc.requestCallback<_seats_booking_v1_PaymentRequest__Output>): grpc.ClientUnaryCall;
  startPayment(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_PaymentRequest__Output>): grpc.ClientUnaryCall;
  startPayment(argument: _seats_booking_v1_BookingRef, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_PaymentRequest__Output>): grpc.ClientUnaryCall;
  startPayment(argument: _seats_booking_v1_BookingRef, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_PaymentRequest__Output>): grpc.ClientUnaryCall;
  startPayment(argument: _seats_booking_v1_BookingRef, callback: grpc.requestCallback<_seats_booking_v1_PaymentRequest__Output>): grpc.ClientUnaryCall;
  
  UpdateCustomerProfile(argument: _seats_booking_v1_CustomerProfileRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  UpdateCustomerProfile(argument: _seats_booking_v1_CustomerProfileRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  UpdateCustomerProfile(argument: _seats_booking_v1_CustomerProfileRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  UpdateCustomerProfile(argument: _seats_booking_v1_CustomerProfileRequest, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  updateCustomerProfile(argument: _seats_booking_v1_CustomerProfileRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  updateCustomerProfile(argument: _seats_booking_v1_CustomerProfileRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  updateCustomerProfile(argument: _seats_booking_v1_CustomerProfileRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  updateCustomerProfile(argument: _seats_booking_v1_CustomerProfileRequest, callback: grpc.requestCallback<_seats_booking_v1_CustomerProfile__Output>): grpc.ClientUnaryCall;
  
  VerifyBookingReference(argument: _seats_booking_v1_BookingReference, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_VerificationResult__Output>): grpc.ClientUnaryCall;
  VerifyBookingReference(argument: _seats_booking_v1_BookingReference, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_VerificationResult__Output>): grpc.ClientUnaryCall;
  VerifyBookingReference(argument: _seats_booking_v1_BookingReference, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_VerificationResult__Output>): grpc.ClientUnaryCall;
  VerifyBookingReference(argument: _seats_booking_v1_BookingReference, callback: grpc.requestCallback<_seats_booking_v1_VerificationResult__Output>): grpc.ClientUnaryCall;
  verifyBookingReference(argument: _seats_booking_v1_BookingReference, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_VerificationResult__Output>): grpc.ClientUnaryCall;
  verifyBookingReference(argument: _seats_booking_v1_BookingReference, metadata: grpc.Metadata, callback: grpc.requestCallback<_seats_booking_v1_VerificationResult__Output>): grpc.ClientUnaryCall;
  verifyBookingReference(argument: _seats_booking_v1_BookingReference, options: grpc.CallOptions, callback: grpc.requestCallback<_seats_booking_v1_VerificationResult__Output>): grpc.ClientUnaryCall;
  verifyBookingReference(argument: _seats_booking_v1_BookingReference, callback: grpc.requestCallback<_seats_booking_v1_VerificationResult__Output>): grpc.ClientUnaryCall;
  
}

export interface BookingsHandlers extends grpc.UntypedServiceImplementation {
  AcceptBookingTerms: grpc.handleUnaryCall<_seats_booking_v1_BookingRef__Output, _seats_booking_v1_Booking>;
  
  CancelBooking: grpc.handleUnaryCall<_seats_booking_v1_BookingRef__Output, _seats_booking_v1_Booking>;
  
  CheckInBooking: grpc.handleUnaryCall<_seats_booking_v1_BookingReference__Output, _seats_booking_v1_Booking>;
  
  ConfirmBookingPayment: grpc.handleUnaryCall<_seats_booking_v1_ConfirmBookingPaymentRequest__Output, _seats_booking_v1_Booking>;
  
  CreateCustomerProfile: grpc.handleUnaryCall<_seats_booking_v1_CustomerProfileRequest__Output, _seats_booking_v1_CustomerProfile>;
  
  CreateHeldBooking: grpc.handleUnaryCall<_seats_booking_v1_CreateHeldBookingRequest__Output, _seats_booking_v1_Booking>;
  
  GetBooking: grpc.handleUnaryCall<_seats_booking_v1_BookingRef__Output, _seats_booking_v1_Booking>;
  
  GetBookingTerms: grpc.handleUnaryCall<_seats_booking_v1_BookingRef__Output, _seats_booking_v1_BookingTerms>;
  
  GetCustomerBookings: grpc.handleUnaryCall<_seats_booking_v1_Empty__Output, _seats_booking_v1_BookingList>;
  
  GetCustomerProfile: grpc.handleUnaryCall<_seats_booking_v1_Empty__Output, _seats_booking_v1_CustomerProfile>;
  
  GetETicket: grpc.handleUnaryCall<_seats_booking_v1_BookingRef__Output, _seats_booking_v1_ETicket>;
  
  GetRoundBookings: grpc.handleUnaryCall<_seats_booking_v1_RoundRef__Output, _seats_booking_v1_BookingList>;
  
  SetPartySize: grpc.handleUnaryCall<_seats_booking_v1_SetPartySizeRequest__Output, _seats_booking_v1_Booking>;
  
  StartPayment: grpc.handleUnaryCall<_seats_booking_v1_BookingRef__Output, _seats_booking_v1_PaymentRequest>;
  
  UpdateCustomerProfile: grpc.handleUnaryCall<_seats_booking_v1_CustomerProfileRequest__Output, _seats_booking_v1_CustomerProfile>;
  
  VerifyBookingReference: grpc.handleUnaryCall<_seats_booking_v1_BookingReference__Output, _seats_booking_v1_VerificationResult>;
  
}

export interface BookingsDefinition extends grpc.ServiceDefinition {
  AcceptBookingTerms: MethodDefinition<_seats_booking_v1_BookingRef, _seats_booking_v1_Booking, _seats_booking_v1_BookingRef__Output, _seats_booking_v1_Booking__Output>
  CancelBooking: MethodDefinition<_seats_booking_v1_BookingRef, _seats_booking_v1_Booking, _seats_booking_v1_BookingRef__Output, _seats_booking_v1_Booking__Output>
  CheckInBooking: MethodDefinition<_seats_booking_v1_BookingReference, _seats_booking_v1_Booking, _seats_booking_v1_BookingReference__Output, _seats_booking_v1_Booking__Output>
  ConfirmBookingPayment: MethodDefinition<_seats_booking_v1_ConfirmBookingPaymentRequest, _seats_booking_v1_Booking, _seats_booking_v1_ConfirmBookingPaymentRequest__Output, _seats_booking_v1_Booking__Output>
  CreateCustomerProfile: MethodDefinition<_seats_booking_v1_CustomerProfileRequest, _seats_booking_v1_CustomerProfile, _seats_booking_v1_CustomerProfileRequest__Output, _seats_booking_v1_CustomerProfile__Output>
  CreateHeldBooking: MethodDefinition<_seats_booking_v1_CreateHeldBookingRequest, _seats_booking_v1_Booking, _seats_booking_v1_CreateHeldBookingRequest__Output, _seats_booking_v1_Booking__Output>
  GetBooking: MethodDefinition<_seats_booking_v1_BookingRef, _seats_booking_v1_Booking, _seats_booking_v1_BookingRef__Output, _seats_booking_v1_Booking__Output>
  GetBookingTerms: MethodDefinition<_seats_booking_v1_BookingRef, _seats_booking_v1_BookingTerms, _seats_booking_v1_BookingRef__Output, _seats_booking_v1_BookingTerms__Output>
  GetCustomerBookings: MethodDefinition<_seats_booking_v1_Empty, _seats_booking_v1_BookingList, _seats_booking_v1_Empty__Output, _seats_booking_v1_BookingList__Output>
  GetCustomerProfile: MethodDefinition<_seats_booking_v1_Empty, _seats_booking_v1_CustomerProfile, _seats_booking_v1_Empty__Output, _seats_booking_v1_CustomerProfile__Output>
  GetETicket: MethodDefinition<_seats_booking_v1_BookingRef, _seats_booking_v1_ETicket, _seats_booking_v1_BookingRef__Output, _seats_booking_v1_ETicket__Output>
  GetRoundBookings: MethodDefinition<_seats_booking_v1_RoundRef, _seats_booking_v1_BookingList, _seats_booking_v1_RoundRef__Output, _seats_booking_v1_BookingList__Output>
  SetPartySize: MethodDefinition<_seats_booking_v1_SetPartySizeRequest, _seats_booking_v1_Booking, _seats_booking_v1_SetPartySizeRequest__Output, _seats_booking_v1_Booking__Output>
  StartPayment: MethodDefinition<_seats_booking_v1_BookingRef, _seats_booking_v1_PaymentRequest, _seats_booking_v1_BookingRef__Output, _seats_booking_v1_PaymentRequest__Output>
  UpdateCustomerProfile: MethodDefinition<_seats_booking_v1_CustomerProfileRequest, _seats_booking_v1_CustomerProfile, _seats_booking_v1_CustomerProfileRequest__Output, _seats_booking_v1_CustomerProfile__Output>
  VerifyBookingReference: MethodDefinition<_seats_booking_v1_BookingReference, _seats_booking_v1_VerificationResult, _seats_booking_v1_BookingReference__Output, _seats_booking_v1_VerificationResult__Output>
}
