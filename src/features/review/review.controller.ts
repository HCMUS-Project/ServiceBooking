import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ReviewService } from './review.service';
import { ICreateReviewRequest, ICreateReviewResponse, IDeleteReviewRequest, IDeleteReviewResponse, IEditReviewRequest, IEditReviewResponse, IFindAllReviewsRequest, IFindAllReviewsResponse, IFindOneReviewRequest, IFindOneReviewResponse } from './interface/review.interface';

@Controller()
export class ReviewController {
    constructor(private readonly reviewService: ReviewService) {}

    @GrpcMethod('ReviewService', 'CreateReview')
    async create(data: ICreateReviewRequest): Promise<ICreateReviewResponse> {
        return await this.reviewService.create(data);
    }

    @GrpcMethod('ReviewService', 'FindOneReview')
    async findOne(data: IFindOneReviewRequest): Promise<IFindOneReviewResponse> {
      return await this.reviewService.findOne(data);
    }

    @GrpcMethod('ReviewService', 'FindAllReviews')
    async findAll(data: IFindAllReviewsRequest):Promise<IFindAllReviewsResponse> {
      return await this.reviewService.findAll(data.user.role);
    }

    @GrpcMethod('ReviewService', 'EditReview')
    async update(data: IEditReviewRequest):Promise<IEditReviewResponse> {
      return await this.reviewService.update(data);
    }

    @GrpcMethod('ReviewService', 'DeleteReview')
    async remove(data: IDeleteReviewRequest):Promise<IDeleteReviewResponse> {
      return await this.reviewService.remove(data.user.role, data.id);
    }
}
