import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import {
    ICreateVoucherRequest,
    ICreateVoucherResponse,
    IDeleteVoucherRequest,
    IDeleteVoucherResponse,
    IEditVoucherRequest,
    IEditVoucherResponse,
    IFindAllVouchersRequest,
    IFindAllVouchersResponse,
    IFindOneVoucherRequest,
    IFindOneVoucherResponse,
    IVoucher,
} from './interface/voucher.interface';
import { GrpcPermissionDeniedException } from 'nestjs-grpc-exceptions';
import { getEnumKeyByEnumValue } from 'src/util/convert_enum/get_key_enum';
import { Role } from 'src/proto_build/auth/user_token_pb';
import { GrpcItemExitException, GrpcItemNotFoundException } from 'src/common/exceptions/exceptions';
import {IDeleteServiceResponse} from '../services/interface/services.interface';

@Injectable()
export class VoucherService {
    constructor(private prismaService: PrismaService) {}

    async create(data: ICreateVoucherRequest): Promise<ICreateVoucherResponse> {
        const { user, ...voucher } = data;

        // check role of user
        if (user.role.toString() !== getEnumKeyByEnumValue(Role, Role.TENANT)) {
            throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
        }

        // console.log(user.role);

        try {
            // check voucher is exist
            if (
                (await this.prismaService.voucher.count({
                    where: { voucher_code: voucher.voucherCode, service_id: voucher.serviceId },
                })) > 0
            ) {
                throw new GrpcItemExitException('VOUCHER_EXIST');
            }

            // create voucher
            const voucherNew = await this.prismaService.voucher.create({
                data: {
                    service_id: voucher.serviceId,
                    voucher_name: voucher.voucherName,
                    voucher_code: voucher.voucherCode,
                    max_discount_value: voucher.maxDiscountValue,
                    min_app_value: voucher.minAppValue,
                    discount_percent: voucher.discountPercent,
                    expired_time: new Date(voucher.expiredTime),
                },
            });

            // console.log(voucherNew);

            return {
                id: voucherNew.id,
            };
        } catch (error) {
            throw error;
        }
    }

    async findAll(role: Role): Promise<IFindAllVouchersResponse> {
        try {
            // find all categories by domain
            // check role of user
            if (role.toString() !== getEnumKeyByEnumValue(Role, Role.TENANT)) {
                throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
            }
            const vouchers = await this.prismaService.voucher.findMany();
            // console.log('abc')
            return {
                vouchers: vouchers.map(voucher => ({
                    vouchersList: [],
                    id: voucher.id,
                    serviceId: voucher.service_id,
                    voucherName: voucher.voucher_name,
                    voucherCode: voucher.voucher_code,
                    maxDiscountValue: voucher.max_discount_value,
                    minAppValue: voucher.min_app_value,
                    discountPercent: voucher.discount_percent,
                    expiredTime: voucher.expired_time.toString(),
                    createdAt: voucher.created_at.toString(),
                })),
            };
        } catch (error) {
            throw error;
        }
    }

    async findOne(data: IFindOneVoucherRequest): Promise<IFindOneVoucherResponse> {
        const { user, id } = data;
        try {
            // find voucher by id
            const voucher = await this.prismaService.voucher.findUnique({
                where: {
                    id,
                },
            });

            // check service is exist
            if (!voucher) {
                throw new GrpcItemNotFoundException('VOUCHER_NOT_EXIST');
            }

            // console.log(service);

            const voucherResult = {
                id: voucher.id,
                serviceId: voucher.service_id,
                voucherName: voucher.voucher_name,
                voucherCode: voucher.voucher_code,
                maxDiscountValue: voucher.max_discount_value,
                minAppValue: voucher.min_app_value,
                discountPercent: voucher.discount_percent,
                expiredTime: voucher.expired_time.toString(),
                createdAt: voucher.created_at.toString(),
            } as IVoucher;

            return {
                voucher: voucherResult,
            };
        } catch (error) {
            throw error;
        }
    }

    async update(data: IEditVoucherRequest): Promise<IEditVoucherResponse> {
        const { user, ...dataUpdate } = data;
        // check role of user
        if (user.role.toString() !== getEnumKeyByEnumValue(Role, Role.TENANT)) {
            throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
        }
        try {
            // Find the category first
            const voucher = await this.prismaService.voucher.findUnique({
                where: { id: dataUpdate.id },
            });

            // console.log(voucher)

            // If the category does not exist, throw an error
            if (!voucher) {
                throw new GrpcItemNotFoundException('CATEGORY_NOT_FOUND');
            }

            // If the category exists, perform the update
            const updatedVoucher = await this.prismaService.voucher.update({
                where: { id: dataUpdate.id },
                data: {
                    voucher_name: dataUpdate.voucherName,
                    voucher_code: dataUpdate.voucherCode,
                    max_discount_value: dataUpdate.maxDiscountValue,
                    min_app_value: dataUpdate.minAppValue,
                    discount_percent: dataUpdate.discountPercent,
                    expired_time: new Date(dataUpdate.expiredTime),
                },
            });
            // console.log(updatedVoucher)
            return {
                result: 'success edit voucher',
            };
        } catch (error) {
            throw error;
        }
    }

    async remove(role: Role, id: string): Promise<IDeleteVoucherResponse> { 
        
        // check role of user
        if (role.toString() !== getEnumKeyByEnumValue(Role, Role.TENANT)) {
            throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
        }

        try {
            // check voucher is exist
            if (
                (await this.prismaService.voucher.count({
                    where: { id },
                })) == 0
            )
                throw new GrpcItemNotFoundException('voucher_NOT_EXIST');

            // delete service;
            // await this.prismaService.voucher.delete({
            //     where: { id: id },
            // });

            await this.prismaService.voucher.delete({
                where: { id },
            });

            return { result: 'success' };
        } catch (error) {
            throw error;
        }
    }
}
