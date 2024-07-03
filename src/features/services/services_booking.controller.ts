import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';

import { GrpcMethod } from '@nestjs/microservices';
import { ServicesBookingService } from './services_booking.service';
import {
    ICreateServiceRequest,
    ICreateServiceResponse,
    IDeleteServiceRequest,
    IDeleteServiceResponse,
    IFindBestSellerServiceRequest,
    IFindBestSellerServiceResponse,
    IFindOneRequest,
    IFindOneResponse,
    IFindRecommendedServiceRequest,
    IFindRecommendedServiceResponse,
    IFindServiceResponse,
    IUpdateServiceRequest,
    IUpdateServiceResponse,
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
        return await this.servicesBookingService.findOne(data.domain, data.id);
    }

    @GrpcMethod('ServicesService', 'FindServices')
    async findService(data: IFindOneRequest): Promise<IFindServiceResponse> {
        return await this.servicesBookingService.find(data);
    }

    @GrpcMethod('ServicesService', 'DeleteService')
    async deleteService(data: IDeleteServiceRequest): Promise<IDeleteServiceResponse> {
        return await this.servicesBookingService.delete(data);
    }

    @GrpcMethod('ServicesService', 'UpdateService')
    async updateService(data: IUpdateServiceRequest): Promise<IUpdateServiceResponse> {
        return await this.servicesBookingService.update(data);
    }

    @GrpcMethod('ServicesService', 'FindBestSellerServices')
    async findBestSeller(
        data: IFindBestSellerServiceRequest,
    ): Promise<IFindBestSellerServiceResponse> {
        return await this.servicesBookingService.findBestSeller(data);
    }

    @GrpcMethod('ServicesService', 'FindRecommendedServices')
    async findRecommended(
        data: IFindRecommendedServiceRequest,
    ): Promise<IFindRecommendedServiceResponse> {
        return await this.servicesBookingService.findRecommended(data);
    }
}
