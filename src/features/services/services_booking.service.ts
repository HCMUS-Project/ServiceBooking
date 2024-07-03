import {
    GrpcInvalidArgumentException,
    GrpcPermissionDeniedException,
} from 'nestjs-grpc-exceptions';
import {
    ICreateServiceRequest,
    ICreateServiceResponse,
    IDeleteServiceRequest,
    IDeleteServiceResponse,
    IFindBestSellerServiceRequest,
    IFindBestSellerServiceResponse,
    IFindOneResponse,
    IFindRecommendedServiceRequest,
    IFindRecommendedServiceResponse,
    IFindServiceRequest,
    IFindServiceResponse,
    IUpdateServiceRequest,
    IUpdateServiceResponse,
} from './interface/services.interface';
import { getEnumKeyByEnumValue } from 'src/util/convert_enum/get_key_enum';
import { Role } from 'src/proto_build/auth/user_token_pb';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { GrpcItemExitException, GrpcItemNotFoundException } from 'src/common/exceptions/exceptions';
import { Injectable } from '@nestjs/common';
import { IUserToken } from 'src/common/interfaces/user_token.interface';
import { SupabaseService } from 'src/util/supabase/supabase.service';

@Injectable()
export class ServicesBookingService {
    constructor(
        private prismaService: PrismaService,
        private supabase: SupabaseService,
    ) {}

    async create(data: ICreateServiceRequest): Promise<ICreateServiceResponse> {
        const { user, timeService, ...service } = data;

        // check role of user
        if (user.role.toString() !== getEnumKeyByEnumValue(Role, Role.TENANT)) {
            throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
        }

        try {
            // check service is exist
            if (
                (await this.prismaService.services.count({
                    where: { name: service.name, domain: user.domain },
                })) > 0
            ) {
                throw new GrpcItemExitException('SERVICE_EXIST');
            }

            // update images into supabase storage
            const imagesUrl = await this.supabase.uploadImageAndGetLink(service.images);
            // const imagesUrl = [''];
            delete service.images;

            // create service and time service
            const serviceNew = await this.prismaService.services.create({
                data: {
                    ...service,
                    domain: user.domain,
                    images: imagesUrl,
                    // Set the time_service field with the ID of the newly created serviceTime
                    time_service: {
                        create: {
                            start_time: timeService.startTime,
                            end_time: timeService.endTime,
                            duration: timeService.duration,
                            break_start: timeService.breakStart,
                            break_end: timeService.breakEnd,
                        },
                    },
                },
                // Include the time_service relation in the response
                include: {
                    time_service: true,
                },
            });

            return {
                ...serviceNew,
                createdAt: serviceNew.created_at.getTime(),
                timeService: {
                    ...timeService,
                },
                numberRating: serviceNew.number_rating,
            };
        } catch (error) {
            throw error;
        }
    }

    async findOne(domain: string, id: string): Promise<IFindOneResponse> {
        try {
            // find service by id
            const service = await this.prismaService.services.findUnique({
                where: { id, domain: domain },
                include: { time_service: true },
            });

            // check service is exist
            if (!service) {
                throw new GrpcItemNotFoundException('SERVICE_NOT_EXIST');
            }

            return {
                ...service,
                timeService: {
                    startTime: service.time_service.start_time,
                    endTime: service.time_service.end_time,
                    duration: service.time_service.duration,
                    breakStart: service.time_service.break_start,
                    breakEnd: service.time_service.break_end,
                },
                createdAt: service.created_at.getTime(),
                numberRating: service.number_rating,
            };
        } catch (error) {
            throw error;
        }
    }

    private createFilter(dataFilter, domain) {
        interface Filter {
            domain: string;
            price?: {
                gte?: number;
                lte?: number;
            };
            name?: {
                contains: string;
            };
            rating?: {
                gte?: number;
            };
        }

        let filter: Filter = { domain };

        if (dataFilter.priceHigher || dataFilter.priceLower) filter.price = {};
        if (dataFilter.priceHigher) filter.price.gte = dataFilter.priceHigher;
        if (dataFilter.priceLower) filter.price.lte = dataFilter.priceLower;
        if (dataFilter.name) filter.name = { contains: dataFilter.name };
        if (dataFilter.rating) {
            filter.rating = {};
            filter.rating.gte = dataFilter.rating;
        }
        // console.log(dataFilter, filter);
        return filter;
    }

    async find(data: IFindServiceRequest): Promise<IFindServiceResponse> {
        const { domain, ...dataFilter } = data;

        // check filter data
        if (
            dataFilter.priceLower &&
            dataFilter.priceHigher &&
            dataFilter.priceHigher > dataFilter.priceLower
        ) {
            throw new GrpcInvalidArgumentException('INVALID_DATA');
        }
        // console.log(dataFilter);

        // get filter data
        const filter = this.createFilter(dataFilter, domain);
        try {
            // find all services
            const services = await this.prismaService.services.findMany({
                where: { ...filter },
                include: { time_service: true },
            });

            return {
                services: services.map(service => ({
                    ...service,
                    numberRating: service.number_rating,
                    timeService: {
                        startTime: service.time_service.start_time,
                        endTime: service.time_service.end_time,
                        duration: service.time_service.duration,
                        breakStart: service.time_service.break_start,
                        breakEnd: service.time_service.break_end,
                    },
                    createdAt: service.created_at.getTime(),
                })),
            };
        } catch (error) {
            throw error;
        }
    }

    async delete(data: IDeleteServiceRequest): Promise<IDeleteServiceResponse> {
        const { user, id } = data;

        // check role of user
        if (user.role.toString() !== getEnumKeyByEnumValue(Role, Role.TENANT)) {
            throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
        }

        try {
            // check service is exist
            if (
                (await this.prismaService.services.count({
                    where: { id },
                })) == 0
            )
                throw new GrpcItemNotFoundException('SERVICE_NOT_EXIST');

            // delete service;
            await this.prismaService.serviceTime.delete({
                where: { service_id: id },
            });

            await this.prismaService.services.delete({
                where: { id },
            });

            return { result: 'success' };
        } catch (error) {
            throw error;
        }
    }

    async update(data: IUpdateServiceRequest): Promise<IUpdateServiceResponse> {
        const { user, timeService, id, ...service } = data;

        // check role of user
        if (user.role.toString() !== getEnumKeyByEnumValue(Role, Role.TENANT)) {
            throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
        }

        try {
            // check service is exist
            if (
                (await this.prismaService.services.count({
                    where: { id, domain: user.domain },
                })) == 0
            )
                throw new GrpcItemNotFoundException('SERVICE_NOT_EXIST');

            // update images into supabase storage
            const imagesUrl = await this.supabase.uploadImageAndGetLink(service.images);
            // const imagesUrl = [''];
            delete service.images;

            // update service and time service
            const serviceNew = await this.prismaService.services.update({
                where: { id },
                data: {
                    ...service,
                    images: imagesUrl,
                    time_service: {
                        update: {
                            start_time: timeService.startTime,
                            end_time: timeService.endTime,
                            duration: timeService.duration,
                            break_start: timeService.breakStart,
                            break_end: timeService.breakEnd,
                        },
                    },
                },
                include: {
                    time_service: true,
                },
            });

            return {
                ...serviceNew,
                createdAt: serviceNew.created_at.getTime(),
                numberRating: serviceNew.number_rating,
                timeService: {
                    ...timeService,
                },
            };
        } catch (error) {
            throw error;
        }
    }

    async findBestSeller(
        data: IFindBestSellerServiceRequest,
    ): Promise<IFindBestSellerServiceResponse> {
        try {
            const services = await this.prismaService.services.findMany({
                where: {
                    id: {
                        in: (
                            await this.prismaService.booking.groupBy({
                                by: ['service_id'],
                                where: {
                                    AND: [
                                        { status: 'SUCCESS' },
                                        { Service: { domain: data.domain } },
                                    ],
                                },
                                _count: { service_id: true },
                                orderBy: { _count: { service_id: 'desc' } },
                                take: 5,
                            })
                        ).map(booking => booking.service_id),
                    },
                },
                include: { time_service: true },
            });

            return {
                services: services.map(service => ({
                    ...service,
                    numberRating: service.number_rating,
                    timeService: {
                        startTime: service.time_service.start_time,
                        endTime: service.time_service.end_time,
                        duration: service.time_service.duration,
                        breakStart: service.time_service.break_start,
                        breakEnd: service.time_service.break_end,
                    },
                    createdAt: service.created_at.getTime(),
                })),
            };
        } catch (error) {
            throw error;
        }
    }

    async findRecommended(
        data: IFindRecommendedServiceRequest,
    ): Promise<IFindRecommendedServiceResponse> {
        try {
            const services = await this.prismaService.services.findMany({
                where: {
                    domain: data.domain,
                },
                take: 5,
                orderBy: {
                    rating: 'desc',
                },
                include: {
                    time_service: true,
                },
            });

            return {
                services: services.map(service => ({
                    ...service,
                    numberRating: service.number_rating,
                    timeService: {
                        startTime: service.time_service.start_time,
                        endTime: service.time_service.end_time,
                        duration: service.time_service.duration,
                        breakStart: service.time_service.break_start,
                        breakEnd: service.time_service.break_end,
                    },
                    createdAt: service.created_at.getTime(),
                })),
            };
        } catch (error) {
            throw error;
        }
    }
}
