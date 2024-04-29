import {
    CreateEmployeeRequest,
    CreateEmployeeResponse,
    DeleteEmployeeRequest,
    DeleteEmployeeResponse,
    FindEmployeeRequest,
    FindEmployeeResponse,
    FindOneEmployeeRequest,
    FindOneEmployeeResponse,
    UpdateEmployeeRequest,
    UpdateEmployeeResponse,
} from 'src/proto_build/employee/employee_pb';
import { IService } from './service.interface';

export interface ICreateEmployeeRequest
    extends Omit<CreateEmployeeRequest.AsObject, 'workDaysList' | 'workShiftList' | 'services'> {
    workDays: string[];
    workShift: string[];
    services: string[];
}
export interface ICreateEmployeeResponse extends CreateEmployeeResponse.AsObject {}

export interface IFindOneEmployeeRequest extends FindOneEmployeeRequest.AsObject {}
export interface IFindOneEmployeeResponse
    extends Omit<
        FindOneEmployeeResponse.AsObject,
        'workDaysList' | 'workShiftList' | 'servicesList'
    > {
    workDays: string[];
    workShift: string[];
    services: IService[];
}

export interface IFindEmployeeRequest
    extends Omit<FindEmployeeRequest.AsObject, 'workDaysList' | 'workShiftList' | 'services'> {
    workDays: string[];
    workShift: string[];
    services: string[];
}
export interface IFindEmployeeResponse
    extends Omit<FindEmployeeResponse.AsObject, 'employeesList'> {
    employees: IFindOneEmployeeResponse[];
}

export interface IUpdateEmployeeRequest
    extends Omit<UpdateEmployeeRequest.AsObject, 'workDaysList' | 'workShiftList' | 'services'> {
    workDays: string[];
    workShift: string[];
    services: string[];
}
export interface IUpdateEmployeeResponse extends UpdateEmployeeResponse.AsObject {}

export interface IDeleteEmployeeRequest extends DeleteEmployeeRequest.AsObject {}
export interface IDeleteEmployeeResponse extends DeleteEmployeeResponse.AsObject {}
