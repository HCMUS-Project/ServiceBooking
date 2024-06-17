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
    FindAllBookingRequest,
    FindAllBookingResponse,
    Service,
} from 'src/proto_build/booking/booking_pb';
import { ISlotBooking } from './slot_booking.interface';

export interface IFindSlotBookingsRequest extends FindSlotBookingsRequest.AsObject {}
export interface IFindSlotBookingsResponse
    extends Omit<FindSlotBookingsResponse.AsObject, 'slotBookingsList'> {
    slotBookings: ISlotBooking[];
}

export interface IService extends Omit<Service.AsObject, 'imagesList'> {
    images: string[];
}

export interface ICreateBookingRequest extends CreateBookingRequest.AsObject {}
export interface ICreateBookingResponse extends CreateBookingResponse.AsObject {}

export interface IFindOneRequest extends FindOneRequest.AsObject {}
// export interface IFindOneResponse extends FindOneResponse.AsObject {
// }

export interface IFindOneResponse extends Omit<FindOneResponse.AsObject, 'service'> {
    service: IService
}

export interface IDeleteBookingRequest extends DeleteBookingRequest.AsObject {}
export interface IDeleteBookingResponse extends DeleteBookingResponse.AsObject {}

export interface IUpdateStatusBookingRequest extends UpdateStatusBookingRequest.AsObject {}

export interface IFindAllBookingRequest
    extends Omit<FindAllBookingRequest.AsObject, 'statusList' | 'dateList' | 'servicesList'> {
    status: string[];
    date: string[];
    services: string[];
}
export interface IFindAllBookingResponse
    extends Omit<FindAllBookingResponse.AsObject, 'bookingsList'> {
    bookings: IFindOneResponse[];
}
