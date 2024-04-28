import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';

import { GrpcMethod } from '@nestjs/microservices';
import { ServicesService } from './services.service';
import { ICreateServiceRequest, ICreateServiceResponse } from './interface/services.interface';

@Controller()
export class ServicesController {
    constructor(private readonly servicesService: ServicesService) {}

    @GrpcMethod('ServicesService', 'CreateService')
    async create(data: ICreateServiceRequest): Promise<ICreateServiceResponse> {
        return await this.servicesService.create(data);
    }
}
