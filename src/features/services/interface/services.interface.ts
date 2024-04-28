import {
    CreateServiceRequest,
    CreateServiceResponse,
    DeleteServiceRequest,
    DeleteServiceResponse,
    FindOneRequest,
    FindOneResponse,
    FindServicesRequest,
    FindServicesResponse,
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
