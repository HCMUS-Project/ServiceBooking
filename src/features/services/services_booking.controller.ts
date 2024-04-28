import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';

import { GrpcMethod } from '@nestjs/microservices';
import { ServicesBookingService } from './services_booking.service';
import {
    ICreateServiceRequest,
    ICreateServiceResponse,
    IDeleteServiceRequest,
    IDeleteServiceResponse,
    IFindOneRequest,
    IFindOneResponse,
    IFindServiceResponse,
} from './interface/services.interface';

@Controller()
export class ServicesBookingController {
    constructor(private readonly servicesBookingService: ServicesBookingService) {}

    @GrpcMethod('ServicesService', 'CreateService')
    async create(data: ICreateServiceRequest): Promise<ICreateServiceResponse> {
        return await this.servicesBookingService.create(data);
    }

    @GrpcMethod('ServicesService', 'FindOne')
    async findOne(data: IFindOneRequest): Promise<IFindOneResponse> {
        return await this.servicesBookingService.findOne(data.user, data.id);
    }

    @GrpcMethod('ServicesService', 'FindServices')
    async findService(data: IFindOneRequest): Promise<IFindServiceResponse> {
        return await this.servicesBookingService.find(data);
    }

    @GrpcMethod('ServicesService', 'DeleteService')
    async deleteService(data: IDeleteServiceRequest): Promise<IDeleteServiceResponse> {
        return await this.servicesBookingService.delete(data);
    }
}
