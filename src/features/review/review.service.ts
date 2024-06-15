import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import {
    ICreateReviewRequest,
    ICreateReviewResponse,
    IDeleteReviewRequest,
    IDeleteReviewResponse,
    IFindAllReviewsRequest,
    IFindAllReviewsResponse,
    IUpdateReviewRequest,
    IUpdateReviewResponse,
} from './interface/review.interface';
import { getEnumKeyByEnumValue } from 'src/util/convert_enum/get_key_enum';
import { Role } from 'src/proto_build/auth/user_token_pb';
import {
    GrpcInvalidArgumentException,
    GrpcPermissionDeniedException,
} from 'nestjs-grpc-exceptions';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReviewService {
    constructor(private prismaService: PrismaService) {}

    async create(dataRequest: ICreateReviewRequest): Promise<ICreateReviewResponse> {
        const { user, ...dataCreate } = dataRequest;

        // check role of user
        if (user.role.toString() === getEnumKeyByEnumValue(Role, Role.ADMIN)) {
            throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
        }

        try {
            return await this.prismaService.$transaction(async transaction => {
                // Check if user has purchased the product
                if (
                    user.role.toString() === getEnumKeyByEnumValue(Role, Role.USER) &&
                    !(await this.checkUserPurchase(user.email, dataCreate.serviceId, transaction))
                ) {
                    throw new GrpcInvalidArgumentException('USER_HAS_NOT_PURCHASED_SERVICE');
                }

                const reviewConditions = { service_id: dataCreate.serviceId, user: user.email };
                const reviewExists = await transaction.review.findFirst({
                    where: reviewConditions,
                });

                let review = null;
                let service = await transaction.services.findUnique({
                    where: { id: dataCreate.serviceId },
                });

                // let decimalRating = new Decimal(dataCreate.rating);
                if (reviewExists) {
                    // const oldRating = new Decimal(reviewExists.rating);
                    review = await transaction.review.update({
                        where: { id: reviewExists.id },
                        data: { rating: dataCreate.rating, review: dataCreate.review },
                    });
                    // Calculate new average rating
                    const newRating =
                        (service.rating * service.number_rating -
                            Number(reviewExists.rating) +
                            dataCreate.rating) /
                        service.number_rating;
                    // Update service
                    await transaction.services.update({
                        where: { id: dataCreate.serviceId },
                        data: { rating: newRating },
                    });
                } else {
                    review = await transaction.review.create({
                        data: {
                            ...reviewConditions,
                            rating: dataCreate.rating,
                            review: dataCreate.review,
                        },
                    });
                    // Calculate new average rating
                    const newRating =
                        (service.rating * service.number_rating + Number(review.rating)) /
                        (service.number_rating + 1);
                    // Update service
                    await transaction.services.update({
                        where: { id: dataCreate.serviceId },
                        data: {
                            rating: newRating,
                            number_rating: { increment: 1 },
                        },
                    });
                }

                return {
                    review: {
                        ...review,
                        serviceId: review.service_id,
                        createdAt: review.created_at.toISOString(),
                        updatedAt: review.updated_at.toISOString(),
                    },
                };
            });
        } catch (error) {
            throw error;
        }
    }

    async checkUserPurchase(user: string, serviceId: string, transaction) {
        try {
            // Check if user has purchased the product
            const bookingDone = await transaction.booking.findFirst({
                where: {
                    user: user,
                    service_id: serviceId,
                    status: 'SUCCESS',
                },
            });
            return bookingDone !== null;
        } catch (error) {
            throw error;
        }
    }

    async findAll(data: IFindAllReviewsRequest): Promise<IFindAllReviewsResponse> {
        const page = data.page | 1;
        const pageSize = data.pageSize | 10;

        try {
            let servicesIds: string[];
            if (data.serviceId === undefined) {
                servicesIds = (
                    await this.prismaService.services.findMany({
                        where: { domain: data.domain },
                        select: {
                            id: true,
                        },
                    })
                ).map(service => service.id);
            } else {
                servicesIds = [data.serviceId];
            }
            // console.log(servicesIds);
            const reviews = await this.prismaService.review.findMany({
                where: {
                    service_id: {
                        in: servicesIds,
                    },
                },
                orderBy: { created_at: 'desc' },
                take: pageSize,
                skip: (page - 1) * pageSize,
            });

            const total = await this.prismaService.review.count({
                where: {
                    service_id: data.serviceId,
                },
            });

            const totalPages = Math.ceil(total / pageSize);

            return {
                reviews: reviews.map(review => {
                    return {
                        id: review.id,
                        type: review.type,
                        serviceId: review.service_id,
                        user: review.user,
                        rating: Number(review.rating),
                        review: review.review,
                        createdAt: review.created_at.toISOString(),
                        updatedAt: review.updated_at.toISOString(),
                    };
                }),
                totalPages: totalPages,
                page: page,
                pageSize: pageSize,
            };
        } catch (error) {
            throw error;
        }
    }

    async update(data: IUpdateReviewRequest): Promise<IUpdateReviewResponse> {
        const { user, ...dataUpdate } = data;

        if (user.role.toString() !== getEnumKeyByEnumValue(Role, Role.USER)) {
            throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
        }

        try {
            return await this.prismaService.$transaction(async transaction => {
                const reviewConditions = { service_id: dataUpdate.id, user: user.email };
                const reviewExists = await transaction.review.findFirst({
                    where: reviewConditions,
                });
                // check if review exists
                if (!reviewExists) {
                    throw new GrpcInvalidArgumentException('REVIEW_NOT_FOUND');
                }
                console.log(dataUpdate)
                let service = await transaction.services.findUnique({
                    where: { id: reviewExists.service_id },
                });

                // Calculate new average rating
                const newRating =
                    (service.rating * service.number_rating -
                        Number(reviewExists.rating) +
                        dataUpdate.rating) /
                    service.number_rating;
                const reviewUpdate = await transaction.review.update({
                    where: {
                        id: reviewExists.id,
                    },
                    data: {
                        rating: dataUpdate.rating,
                        review: dataUpdate.review,
                    },
                });
                // Update service
                await transaction.services.update({
                    where: { id: reviewUpdate.service_id },
                    data: { rating: newRating },
                });

                return {
                    review: {
                        ...reviewUpdate,
                        createdAt: reviewUpdate.created_at.toISOString(),
                        updatedAt: reviewUpdate.updated_at.toISOString(),
                        serviceId: reviewUpdate.service_id,
                        rating: Number(reviewUpdate.rating),
                    },
                };
            });
        } catch (error) {
            throw error;
        }
    }

    async remove(data: IDeleteReviewRequest): Promise<IDeleteReviewResponse> {
        const { user, id } = data;
        if (user.role.toString() !== getEnumKeyByEnumValue(Role, Role.USER)) {
            throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
        }

        try {
            // check if review exists
            if (
                !(await this.prismaService.review.findFirst({
                    where: { id: id, user: user.email },
                }))
            ) {
                throw new GrpcInvalidArgumentException('REVIEW_NOT_FOUND');
            }

            await this.prismaService.review.delete({
                where: {
                    id: id,
                },
            });

            return { result: 'success' };
        } catch (error) {
            throw error;
        }
    }
}
