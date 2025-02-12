import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { BookingService } from './booking.service';
import {
    ICreateBookingRequest,
    ICreateBookingResponse,
    IDeleteBookingRequest,
    IDeleteBookingResponse,
    IFindAllBookingRequest,
    IFindAllBookingResponse,
    IFindOneRequest,
    IFindOneResponse,
    IFindSlotBookingsRequest,
    IFindSlotBookingsResponse,
    IGetBookingsReportOfListUsersRequest,
    IGetBookingsReportOfListUsersResponse,
    IGetBookingsValueByDateTypeRequest,
    IGetBookingsValueByDateTypeResponse,
    IUpdateStatusBookingRequest,
} from './interface/booking.interface';

@Controller()
export class BookingController {
    constructor(private readonly bookingService: BookingService) {}

    @GrpcMethod('BookingService', 'FindSlotBookings')
    async findSlotBookings(data: IFindSlotBookingsRequest): Promise<IFindSlotBookingsResponse> {
        return await this.bookingService.findSlotBookings(data);
    }

    @GrpcMethod('BookingService', 'CreateBooking')
    async createBooking(data: ICreateBookingRequest): Promise<ICreateBookingResponse> {
        return await this.bookingService.createBooking(data);
    }

    @GrpcMethod('BookingService', 'FindOne')
    async findOne(data: IFindOneRequest): Promise<IFindOneResponse> {
        return await this.bookingService.findOne(data);
    }

    @GrpcMethod('BookingService', 'DeleteBooking')
    async deleteBooking(data: IDeleteBookingRequest): Promise<IDeleteBookingResponse> {
        return await this.bookingService.deleteBooking(data);
    }

    @GrpcMethod('BookingService', 'UpdateStatusBooking')
    async updateStatusBooking(data: IUpdateStatusBookingRequest): Promise<IFindOneResponse> {
        return await this.bookingService.updateStatusBooking(data);
    }

    @GrpcMethod('BookingService', 'FindAllBooking')
    async findAllBooking(data: IFindAllBookingRequest): Promise<IFindAllBookingResponse> {
        return await this.bookingService.findAllBooking(data);
    }

    @GrpcMethod('BookingService', 'GetBookingsReportOfListUsers')
    async getBookingsReportOfListUsers(
        data: IGetBookingsReportOfListUsersRequest,
    ): Promise<IGetBookingsReportOfListUsersResponse> {
        return await this.bookingService.getBookingsReportOfListUsers(data);
    }

    @GrpcMethod('BookingService', 'GetBookingsValueByDateType')
    async GetBookingsValueByDateType(
        data: IGetBookingsValueByDateTypeRequest,
    ): Promise<IGetBookingsValueByDateTypeResponse> {
        return await this.bookingService.getBookingsValueByDateType(data);
    }
}
