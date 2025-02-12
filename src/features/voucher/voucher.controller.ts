import { Controller } from '@nestjs/common';
import { GrpcMethod, MessagePattern, Payload } from '@nestjs/microservices';
import { VoucherService } from './voucher.service';
import {
    ICreateVoucherRequest,
    ICreateVoucherResponse,
    IDeleteVoucherRequest,
    IDeleteVoucherResponse,
    IEditVoucherRequest,
    IEditVoucherResponse,
    IFindAllVouchersByTenantRequest,
    IFindAllVouchersRequest,
    IFindAllVouchersResponse,
    IFindOneVoucherRequest,
    IFindOneVoucherResponse,
} from './interface/voucher.interface';

@Controller()
export class VoucherController {
    constructor(private readonly voucherService: VoucherService) {}

    @GrpcMethod('VoucherService', 'CreateVoucher')
    async create(data: ICreateVoucherRequest): Promise<ICreateVoucherResponse> {
        return await this.voucherService.create(data);
    }

    @GrpcMethod('VoucherService', 'FindOneVoucher')
    async findOne(data: IFindOneVoucherRequest): Promise<IFindOneVoucherResponse> {
        return await this.voucherService.findOne(data);
    }

    @GrpcMethod('VoucherService', 'FindAllVouchers')
    async findAll(data: IFindAllVouchersRequest): Promise<IFindAllVouchersResponse> {
        return await this.voucherService.findAll(data);
    }

    @GrpcMethod('VoucherService', 'FindAllVouchersByTenant')
    async findAllVouchersByTenant(data: IFindAllVouchersByTenantRequest): Promise<IFindAllVouchersResponse> {
        return await this.voucherService.findAllVouchersByTenant(data);
    }


    @GrpcMethod('VoucherService', 'EditVoucher')
    async update(data: IEditVoucherRequest): Promise<IEditVoucherResponse> {
        // console.log(data)
        return await this.voucherService.update(data);
    }

    @GrpcMethod('VoucherService', 'DeleteVoucher')
    async remove(data: IDeleteVoucherRequest): Promise<IDeleteVoucherResponse> {
        return await this.voucherService.remove(data.user.role, data.id);
    }
}
