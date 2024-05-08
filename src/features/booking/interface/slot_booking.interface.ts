import { Emp, Service, SlotBooking } from 'src/proto_build/booking/booking_pb';

export interface IEmp extends Emp.AsObject {}
export interface IService extends Service.AsObject {}
export interface ISlotBooking extends Omit<SlotBooking.AsObject, 'employeesList'> {
    employees: IEmp[];
}
