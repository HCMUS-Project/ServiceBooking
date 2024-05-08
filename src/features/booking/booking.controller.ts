import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { BookingService } from './booking.service';
import {
    ICreateBookingRequest,
    ICreateBookingResponse,
    IFindOneRequest,
    IFindOneResponse,
    IFindSlotBookingsRequest,
    IFindSlotBookingsResponse,
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
}
