import {
    CreateBookingRequest,
    CreateBookingResponse,
    FindSlotBookingsRequest,
    FindSlotBookingsResponse,
    FindOneRequest,
    FindOneResponse,
    DeleteBookingRequest,
    DeleteBookingResponse,
    UpdateStatusBookingRequest,
} from 'src/proto_build/booking/booking_pb';
import { ISlotBooking } from './slot_booking.interface';

export interface IFindSlotBookingsRequest extends FindSlotBookingsRequest.AsObject {}
export interface IFindSlotBookingsResponse
    extends Omit<FindSlotBookingsResponse.AsObject, 'slotBookingsList'> {
    slotBookings: ISlotBooking[];
}

export interface ICreateBookingRequest extends CreateBookingRequest.AsObject {}
export interface ICreateBookingResponse extends CreateBookingResponse.AsObject {}

export interface IFindOneRequest extends FindOneRequest.AsObject {}
export interface IFindOneResponse extends FindOneResponse.AsObject {}

export interface IDeleteBookingRequest extends DeleteBookingRequest.AsObject {}
export interface IDeleteBookingResponse extends DeleteBookingResponse.AsObject {}

export interface IUpdateStatusBookingRequest extends UpdateStatusBookingRequest.AsObject {}
