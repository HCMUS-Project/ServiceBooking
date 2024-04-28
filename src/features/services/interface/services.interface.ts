import {
    CreateServiceRequest,
    CreateServiceResponse,
    FindOneRequest,
    FindOneResponse,
} from 'src/proto_build/services/services_pb';

export interface ICreateServiceRequest extends CreateServiceRequest.AsObject {}
export interface ICreateServiceResponse extends CreateServiceResponse.AsObject {}

export interface IFindOneRequest extends FindOneRequest.AsObject {}
export interface IFindOneResponse extends FindOneResponse.AsObject {}
