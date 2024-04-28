import { CreateServiceRequest, CreateServiceResponse } from 'src/proto_build/services/services_pb';

export interface ICreateServiceRequest extends CreateServiceRequest.AsObject {}
export interface ICreateServiceResponse extends CreateServiceResponse.AsObject {}
