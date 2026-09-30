import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { BookingsClient as _seats_booking_v1_BookingsClient, BookingsDefinition as _seats_booking_v1_BookingsDefinition } from './seats/booking/v1/Bookings';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  seats: {
    booking: {
      v1: {
        Booking: MessageTypeDefinition
        BookingList: MessageTypeDefinition
        BookingRef: MessageTypeDefinition
        BookingReference: MessageTypeDefinition
        BookingTerms: MessageTypeDefinition
        Bookings: SubtypeConstructor<typeof grpc.Client, _seats_booking_v1_BookingsClient> & { service: _seats_booking_v1_BookingsDefinition }
        CheckInWindow: MessageTypeDefinition
        ConfirmBookingPaymentRequest: MessageTypeDefinition
        CreateHeldBookingRequest: MessageTypeDefinition
        CustomerProfile: MessageTypeDefinition
        CustomerProfileRequest: MessageTypeDefinition
        ETicket: MessageTypeDefinition
        Empty: MessageTypeDefinition
        Fee: MessageTypeDefinition
        PaymentRequest: MessageTypeDefinition
        RoundRef: MessageTypeDefinition
        SetPartySizeRequest: MessageTypeDefinition
        StatusChange: MessageTypeDefinition
        VerificationResult: MessageTypeDefinition
      }
    }
  }
}

