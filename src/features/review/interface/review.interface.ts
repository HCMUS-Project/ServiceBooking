import {
    CreateReviewRequest,
    CreateReviewResponse,
    DeleteReviewRequest,
    DeleteReviewResponse,
    EditReviewRequest,
    EditReviewResponse,
    FindAllReviewsRequest,
    FindAllReviewsResponse,
    FindOneReviewRequest,
    FindOneReviewResponse,
    Review,
} from 'src/proto_build/review/review_pb';

export interface IReview extends Review.AsObject {}

export interface ICreateReviewRequest extends CreateReviewRequest.AsObject {}
export interface ICreateReviewResponse extends CreateReviewResponse.AsObject {}

export interface IFindOneReviewRequest extends FindOneReviewRequest.AsObject {}
export interface IFindOneReviewResponse extends FindOneReviewResponse.AsObject {}

export interface IFindAllReviewsRequest extends FindAllReviewsRequest.AsObject {}
export interface IFindAllReviewsResponse
    extends Omit<FindAllReviewsResponse.AsObject, 'reviewsList'> {
    reviews: FindAllReviewsResponse.AsObject[];
}

export interface IEditReviewRequest extends EditReviewRequest.AsObject{}
export interface IEditReviewResponse extends EditReviewResponse.AsObject{}

export interface IDeleteReviewRequest extends DeleteReviewRequest.AsObject{}
export interface IDeleteReviewResponse extends DeleteReviewResponse.AsObject{}
