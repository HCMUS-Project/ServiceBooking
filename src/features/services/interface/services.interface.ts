import {
    CreateServiceRequest,
    CreateServiceResponse,
    DeleteServiceRequest,
    DeleteServiceResponse,
    FindBestSellerServiceRequest,
    FindBestSellerServiceResponse,
    FindOneRequest,
    FindOneResponse,
    FindRecommendedServiceRequest,
    FindRecommendedServiceResponse,
    FindServicesRequest,
    FindServicesResponse,
    UpdateServiceRequest,
    UpdateServiceResponse,
} from 'src/proto_build/services/services_pb';

export interface ICreateServiceRequest extends Omit<CreateServiceRequest.AsObject, 'imagesList'> {
    images: string[];
}
export interface ICreateServiceResponse extends Omit<CreateServiceResponse.AsObject, 'imagesList'> {
    images: string[];
}

export interface IFindOneRequest extends FindOneRequest.AsObject {}
export interface IFindOneResponse extends Omit<FindOneResponse.AsObject, 'imagesList'> {
    images: string[];
}

export interface IFindServiceRequest extends FindServicesRequest.AsObject {}
export interface IFindServiceResponse extends Omit<FindServicesResponse.AsObject, 'servicesList'> {
    services: IFindOneResponse[];
}

export interface IDeleteServiceRequest extends DeleteServiceRequest.AsObject {}
export interface IDeleteServiceResponse extends DeleteServiceResponse.AsObject {}

export interface IUpdateServiceRequest extends Omit<UpdateServiceRequest.AsObject, 'imagesList'> {
    images: string[];
}
export interface IUpdateServiceResponse extends Omit<UpdateServiceResponse.AsObject, 'imagesList'> {
    images: string[];
}

export interface IFindBestSellerServiceRequest extends FindBestSellerServiceRequest.AsObject {}
export interface IFindBestSellerServiceResponse
    extends Omit<FindBestSellerServiceResponse.AsObject, 'servicesList'> {
    services: IFindOneResponse[];
}

export interface IFindRecommendedServiceRequest extends FindRecommendedServiceRequest.AsObject {}
export interface IFindRecommendedServiceResponse
    extends Omit<FindRecommendedServiceResponse.AsObject, 'servicesList'> {
    services: IFindOneResponse[];
}
