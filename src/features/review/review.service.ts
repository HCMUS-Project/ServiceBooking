import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import {
    ICreateReviewRequest,
    ICreateReviewResponse,
    IDeleteReviewResponse,
    IEditReviewRequest,
    IEditReviewResponse,
    IFindAllReviewsResponse,
    IFindOneReviewRequest,
    IFindOneReviewResponse,
    IReview,
} from './interface/review.interface';
import {
    ICreateVoucherRequest,
    IFindOneVoucherRequest,
} from '../voucher/interface/voucher.interface';
import { getEnumKeyByEnumValue } from 'src/util/convert_enum/get_key_enum';
import { Role } from 'src/proto_build/auth/user_token_pb';
import {
    GrpcPermissionDeniedException,
    GrpcUnauthenticatedException,
} from 'nestjs-grpc-exceptions';
import mongoose, { Model } from 'mongoose';
import { User } from 'src/models/user_mongo/user/interface/user.interface';
import { Profile } from 'src/models/user_mongo/user/interface/profile.interface';
import { GrpcItemNotFoundException } from 'src/common/exceptions/exceptions';

@Injectable()
export class ReviewService {
    constructor(
        private prismaService: PrismaService,
        @Inject('USER_MODEL') private readonly User: Model<User>,
        @Inject('PROFILE_MODEL') private readonly Profile: Model<Profile>,
    ) {}

    async create(data: ICreateReviewRequest): Promise<ICreateReviewResponse> {
        const { user, ...review } = data;
        // console.log(data)

        // check role of user
        if (user.role.toString() !== getEnumKeyByEnumValue(Role, Role.USER)) {
            throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
        }

        // console.log(user.role);

        try {
            // check user is exist
            try {
                const checkUser = await this.User.findOne({
                    _id: new mongoose.Types.ObjectId(review.userId),
                });
                if (!checkUser) throw new GrpcItemNotFoundException('User_id');
            } catch (e) {
                throw new GrpcItemNotFoundException('User_id');
            }

            // create voucher
            const reviewNew = await this.prismaService.review.create({
                data: {
                    user_id: review.userId,
                    service_id: review.serviceId,
                    description: review.description,
                    rating: review.rating,
                },
            });

            // console.log(voucherNew);

            return {
                id: reviewNew.id,
            };
        } catch (error) {
            throw error;
        }
    }

    async findAll(role: Role): Promise<IFindAllReviewsResponse> {
      try {
          // find all categories by domain
          // check role of user
          // if (role.toString() !== getEnumKeyByEnumValue(Role, Role.TENANT)) {
          //     throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
          // }
          const reviews = await this.prismaService.review.findMany();
          // console.log('abc')
          return {
            reviews: reviews.map(review => ({
                  reviewsList: [],
                  ...review,
                  serviceId: review.service_id,
                  userId: review.user_id,
                  createdAt: review.created_at.toString(),
                  updatedAt: review.updated_at.toString(),
              })),
          };
      } catch (error) {
          throw error;
      }
  }

    async findOne(data: IFindOneReviewRequest): Promise<IFindOneReviewResponse> {
        const { user, id } = data;
        try {
            // find review by id
            const review = await this.prismaService.review.findUnique({
                where: {
                    id,
                },
            });

            // check service is exist
            if (!review) {
                throw new GrpcItemNotFoundException('Review');
            }

            // console.log(service);

            const reviewResult = {
                ...review,
                serviceId: review.service_id,
                userId: review.user_id,
                createdAt: review.created_at.toString(),
                updatedAt: review.updated_at.toString(),
            } as IReview;

            return {
                review: reviewResult,
            };
        } catch (error) {
            throw error;
        }
    }
    
    async update(data: IEditReviewRequest): Promise<IEditReviewResponse> {
      const { user, ...dataUpdate } = data;
      // check role of user
      // if (user.role.toString() !== getEnumKeyByEnumValue(Role, Role.TENANT)) {
      //     throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
      // }
      try {
          // Find the category first
          const review = await this.prismaService.review.findUnique({
              where: { id: dataUpdate.id },
          });

          // console.log(voucher)

          // If the category does not exist, throw an error
          if (!review) {
              throw new GrpcItemNotFoundException('Review');
          }

          // If the category exists, perform the update
          const updatedReview = await this.prismaService.review.update({
              where: { id: dataUpdate.id },
              data: {
                  description: dataUpdate.description,
                  rating: dataUpdate.rating
              },
          });
          // console.log(updatedVoucher)
          return {
              result: 'success edit review',
          };
      } catch (error) {
          throw error;
      }
  }

  async remove(role: Role, id: string): Promise<IDeleteReviewResponse> {
    // check role of user
    if (role.toString() !== getEnumKeyByEnumValue(Role, Role.USER)) {
        throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
    }

    try {
        // check voucher is exist
        if (
            (await this.prismaService.review.count({
                where: { id },
            })) == 0
        )
            throw new GrpcItemNotFoundException('Review');

        // delete service;
        // await this.prismaService.voucher.delete({
        //     where: { id: id },
        // });

        await this.prismaService.review.delete({
            where: { id },
        });

        return { result: 'success delete review' };
    } catch (error) {
        throw error;
    }
}
}
