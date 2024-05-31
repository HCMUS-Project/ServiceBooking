import {
    CreateReviewRequest,
    DeleteReviewRequest,
    DeleteReviewResponse,
    FindAllReviewsRequest,
    FindAllReviewsResponse,
    Review,
    ReviewResponse,
    UpdateReviewRequest,
} from 'src/proto_build/review/review_pb';

export interface IReview extends Review.AsObject {}

export interface IReviewResponse {
    review: IReview;
}

export interface ICreateReviewRequest extends CreateReviewRequest.AsObject {}
export interface ICreateReviewResponse extends ReviewResponse.AsObject {}
 
export interface IFindAllReviewsRequest extends FindAllReviewsRequest.AsObject {}
export interface IFindAllReviewsResponse
    extends Omit<FindAllReviewsResponse.AsObject, 'reviewsList'> {
    reviews: IReview[];
}

export interface IUpdateReviewRequest extends UpdateReviewRequest.AsObject {}
export interface IUpdateReviewResponse extends IReviewResponse {}

export interface IDeleteReviewRequest extends DeleteReviewRequest.AsObject {}
export interface IDeleteReviewResponse extends DeleteReviewResponse.AsObject {}