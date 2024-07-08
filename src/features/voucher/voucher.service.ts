import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
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
    IVoucher,
} from './interface/voucher.interface';
import { GrpcPermissionDeniedException } from 'nestjs-grpc-exceptions';
import { getEnumKeyByEnumValue } from 'src/util/convert_enum/get_key_enum';
import { Role } from 'src/proto_build/auth/user_token_pb';
import { GrpcItemExitException, GrpcItemNotFoundException } from 'src/common/exceptions/exceptions';
import { IDeleteServiceResponse } from '../services/interface/services.interface';

@Injectable()
export class VoucherService {
    constructor(private prismaService: PrismaService) {}

    async create(data: ICreateVoucherRequest): Promise<ICreateVoucherResponse> {
        const { user, ...voucher } = data;
        // jklkjlewf
        // check role of user
        if (user.role.toString() !== getEnumKeyByEnumValue(Role, Role.TENANT)) {
            throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
        }

        // console.log(user.role);

        try {
            // check if serviceId exists in the service table
            const service = await this.prismaService.services.findUnique({
                where: { id: voucher.serviceId, deleted_at: null },
            });

            if (!service) {
                throw new GrpcItemNotFoundException('SERVICE_NOT_FOUND');
            }
            // check voucher is exist
            if (
                (await this.prismaService.voucher.count({
                    where: { voucher_code: voucher.voucherCode, service_id: voucher.serviceId },
                })) > 0
            ) {
                throw new GrpcItemExitException('VOUCHER_EXIST');
            }

            const start_date = voucher.startAt ? new Date(voucher.startAt) : new Date();

            // create voucher
            const voucherNew = await this.prismaService.voucher.create({
                data: {
                    service_id: voucher.serviceId,
                    voucher_name: voucher.voucherName,
                    voucher_code: voucher.voucherCode,
                    max_discount: voucher.maxDiscount,
                    min_app_value: voucher.minAppValue,
                    discount_percent: voucher.discountPercent,
                    expire_at: new Date(voucher.expireAt),
                    start_at: start_date,
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

    async findAll(data: IFindAllVouchersRequest): Promise<IFindAllVouchersResponse> {
        try {
            // find all categories by domain
            // check role of user
            // if (role.toString() !== getEnumKeyByEnumValue(Role, Role.TENANT)) {
            //     throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
            // }
            // Find all services in the domain
            const services = await this.prismaService.services.findMany({
                where: {
                    domain: data.user.domain,
                    id: data.service,
                    deleted_at: null,
                },
                select: {
                    id: true,
                },
            });

            // Extract the service IDs
            const serviceIds = services.map(service => service.id);

            const vouchers = await this.prismaService.voucher.findMany({
                where: {
                    service_id: {
                        in: serviceIds,
                    },
                    expire_at: {
                        gte: new Date(),
                    },
                    start_at: {
                        lte: new Date(),
                    },
                    deleted_at: null,
                },
            });
            // console.log('abc')
            return {
                vouchers: vouchers.map(voucher => ({
                    vouchersList: [],
                    id: voucher.id,
                    type: voucher.type,
                    serviceId: voucher.service_id,
                    voucherName: voucher.voucher_name,
                    voucherCode: voucher.voucher_code,
                    maxDiscount: voucher.max_discount,
                    minAppValue: voucher.min_app_value,
                    discountPercent: voucher.discount_percent,
                    expireAt: voucher.expire_at.toString(),
                    createdAt: voucher.created_at.toString(),
                    startAt: voucher.start_at.toString(),
                    deletedAt: voucher.deleted_at ? voucher.deleted_at.toString() : null,
                })),
            };
        } catch (error) {
            throw error;
        }
    }

    async findAllVouchersByTenant(
        data: IFindAllVouchersByTenantRequest,
    ): Promise<IFindAllVouchersResponse> {
        try {
            // find all vouchers by domain
            const vouchers = await this.prismaService.voucher.findMany({
                where: {
                    Service: {
                        domain: data.user.domain,
                    },
                    deleted_at: null,
                },
            });

            return {
                vouchers: vouchers.map(voucher => ({
                    vouchersList: [],
                    id: voucher.id,
                    type: voucher.type,
                    serviceId: voucher.service_id,
                    voucherName: voucher.voucher_name,
                    voucherCode: voucher.voucher_code,
                    maxDiscount: voucher.max_discount,
                    minAppValue: voucher.min_app_value,
                    discountPercent: voucher.discount_percent,
                    expireAt: voucher.expire_at.toString(),
                    createdAt: voucher.created_at.toString(),
                    startAt: voucher.start_at.toString(),
                    deletedAt: voucher.deleted_at ? voucher.deleted_at.toString() : null,
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
                    deleted_at: null,
                },
            });

            // check service is exist
            if (!voucher) {
                throw new GrpcItemNotFoundException('VOUCHER_NOT_FOUND');
            }

            // console.log(service);

            const voucherResult = {
                id: voucher.id,
                type: voucher.type,
                serviceId: voucher.service_id,
                voucherName: voucher.voucher_name,
                voucherCode: voucher.voucher_code,
                maxDiscount: voucher.max_discount,
                minAppValue: voucher.min_app_value,
                discountPercent: voucher.discount_percent,
                expireAt: voucher.expire_at.toString(),
                createdAt: voucher.created_at.toString(),
                startAt: voucher.start_at.toString(),
                deletedAt: voucher.deleted_at ? voucher.deleted_at.toString() : null,
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
                where: { id: dataUpdate.id, deleted_at: null },
            });

            // console.log(voucher)

            // If the category does not exist, throw an error
            if (!voucher) {
                throw new GrpcItemNotFoundException('VOUCHER_NOT_FOUND');
            }

            // Create an object that includes only the fields that are not undefined
            const updateData: Partial<typeof dataUpdate> = {};
            for (const key in dataUpdate) {
                if (dataUpdate[key] !== undefined) {
                    // Map the field names in dataUpdate to the corresponding field names in the database
                    let dbKey: string;
                    switch (key) {
                        case 'voucherName':
                            dbKey = 'voucher_name';
                            break;
                        case 'voucherCode':
                            dbKey = 'voucher_code';
                            break;
                        case 'maxDiscountValue':
                            dbKey = 'max_discount_value';
                            break;
                        case 'minAppValue':
                            dbKey = 'min_app_value';
                            break;
                        case 'discountPercent':
                            dbKey = 'discount_percent';
                            break;
                        case 'expireAt':
                            dbKey = 'expired_at';
                            updateData[dbKey] = new Date(dataUpdate[key]);
                            break;
                        case 'startAt':
                            dbKey = 'start_at';
                            updateData[dbKey] = new Date(dataUpdate[key]);
                            break;
                        default:
                            dbKey = key;
                    }
                    updateData[dbKey] = dataUpdate[key];
                }
            }

            // If the category exists, perform the update
            const updatedVoucher = await this.prismaService.voucher.update({
                where: { id: dataUpdate.id },
                data: updateData,
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
                throw new GrpcItemNotFoundException('VOUCHER_NOT_EXIST');

            // delete service;
            // await this.prismaService.voucher.delete({
            //     where: { id: id },
            // });

            await this.prismaService.voucher.update({
                where: { id },
                data: {
                    deleted_at: null,
                },
            });

            return { result: 'success' };
        } catch (error) {
            throw error;
        }
    }
}
