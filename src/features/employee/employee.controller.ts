import { Controller } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { GrpcMethod } from '@nestjs/microservices';
import {
    ICreateEmployeeRequest,
    ICreateEmployeeResponse,
    IDeleteEmployeeRequest,
    IDeleteEmployeeResponse,
    IFindEmployeeRequest,
    IFindEmployeeResponse,
    IFindOneEmployeeRequest,
    IFindOneEmployeeResponse,
    IUpdateEmployeeRequest,
    IUpdateEmployeeResponse,
} from './interface/employee.interface';

@Controller()
export class EmployeeController {
    constructor(private readonly employeeService: EmployeeService) {}

    @GrpcMethod('EmployeeService', 'CreateEmployee')
    async create(data: ICreateEmployeeRequest): Promise<ICreateEmployeeResponse> {
        return await this.employeeService.create(data);
    }

    @GrpcMethod('EmployeeService', 'FindOneEmployee')
    async findOne(data: IFindOneEmployeeRequest): Promise<IFindOneEmployeeResponse> {
        return await this.employeeService.findOne(data);
    }

    @GrpcMethod('EmployeeService', 'FindEmployee')
    async find(data: IFindEmployeeRequest): Promise<IFindEmployeeResponse> {
        return await this.employeeService.find(data);
    }

    @GrpcMethod('EmployeeService', 'UpdateEmployee')
    async update(data: IUpdateEmployeeRequest): Promise<IUpdateEmployeeResponse> {
        return await this.employeeService.update(data);
    }

    @GrpcMethod('EmployeeService', 'DeleteEmployee')
    async delete(data: IDeleteEmployeeRequest): Promise<IDeleteEmployeeResponse> {
        return await this.employeeService.delete(data);
    }
}
