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

export interface ICreateServiceRequest extends CreateServiceRequest.AsObject {}
export interface ICreateServiceResponse extends CreateServiceResponse.AsObject {}

export interface IFindOneRequest extends FindOneRequest.AsObject {}
export interface IFindOneResponse extends FindOneResponse.AsObject {}

export interface IFindServiceRequest extends FindServicesRequest.AsObject {}
export interface IFindServiceResponse extends Omit<FindServicesResponse.AsObject, 'servicesList'> {
    services: FindOneResponse.AsObject[];
}

export interface IDeleteServiceRequest extends DeleteServiceRequest.AsObject {}
export interface IDeleteServiceResponse extends DeleteServiceResponse.AsObject {}
