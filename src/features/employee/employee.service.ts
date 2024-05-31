import { PrismaService } from 'src/core/prisma/prisma.service';
import {
    ICreateEmployeeRequest,
    ICreateEmployeeResponse,
    IDeleteEmployeeRequest,
    IDeleteEmployeeResponse,
    IFindEmployeeRequest,
    IFindEmployeeResponse,
    IFindOneEmployeeRequest,
    IFindOneEmployeeResponse,
    IUpdateEmployeeRequest,
    IUpdateEmployeeResponse,
} from './interface/employee.interface';
import { getEnumKeyByEnumValue } from 'src/util/convert_enum/get_key_enum';
import {
    GrpcInvalidArgumentException,
    GrpcPermissionDeniedException,
} from 'nestjs-grpc-exceptions';
import { Role } from 'src/proto_build/auth/user_token_pb';
import { GrpcItemNotFoundException } from 'src/common/exceptions/exceptions';
import { WorkShift } from 'src/common/enums/workShift';
import { WorkDays } from 'src/common/enums/workDays';
import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/util/supabase/supabase.service';

@Injectable()
export class EmployeeService {
    constructor(
        private prismaService: PrismaService,
        private supabaseService: SupabaseService,
    ) {}

    async create(data: ICreateEmployeeRequest): Promise<ICreateEmployeeResponse> {
        const { user, firstName, lastName, email, phone, image, workDays, workShift, services } =
            data;

        // check role of user
        if (user.role.toString() !== getEnumKeyByEnumValue(Role, Role.TENANT))
            throw new GrpcPermissionDeniedException('PERMISSION_DENIED');

        // check workDays and workShift
        if (
            !Array.isArray(workDays) ||
            !workDays.every(day =>
                (Object.values(WorkDays) as string[]).includes(day.toUpperCase()),
            )
        )
            throw new GrpcInvalidArgumentException('INVALID_WORK_DAYS');

        if (
            !Array.isArray(workShift) ||
            !workShift.every(shift =>
                (Object.values(WorkShift) as string[]).includes(shift.toUpperCase()),
            )
        )
            throw new GrpcInvalidArgumentException('INVALID_WORK_SHIFTS');

        // check workDays and workShift contain duplicate values
        if (new Set(workDays).size !== workDays.length)
            throw new GrpcInvalidArgumentException('DUPLICATE_WORK_DAYS');
        if (new Set(workShift).size !== workShift.length)
            throw new GrpcInvalidArgumentException('DUPLICATE_WORK_SHIFTS');

        try {
            // check services are exist
            if (
                (await this.prismaService.services.count({
                    where: { id: { in: services } },
                })) != services.length
            )
                throw new GrpcItemNotFoundException('SERVICES_NOT_FOUND');

            // create image link

            // create employee
            const imageUrl = await this.supabaseService.uploadImageAndGetLink([image]);
            const employee = await this.prismaService.employee.create({
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    phone,
                    image: imageUrl[0],
                    work_days: workDays,
                    work_shift: workShift,
                },
            });

            // save services for employee
            for (const service of services) {
                await this.prismaService.employeeService.create({
                    data: {
                        employee_id: employee.id,
                        service_id: service,
                    },
                });
            }

            return { id: employee.id };
        } catch (error) {
            throw error;
        }
    }

    async findOne(data: IFindOneEmployeeRequest): Promise<IFindOneEmployeeResponse> {
        const { id } = data;

        try {
            // find employee
            const employee = await this.prismaService.employee.findUnique({
                where: { id },
                include: {
                    services: {
                        include: {
                            service: true,
                        },
                    },
                },
            });

            if (!employee) throw new GrpcItemNotFoundException('EMPLOYEE_NOT_FOUND');

            // Get service
            const services = employee.services.map(employeeService => employeeService.service);

            return {
                id: employee.id,
                firstName: employee.first_name,
                lastName: employee.last_name,
                email: employee.email,
                phone: employee.phone,
                image: employee.image,
                workDays: employee.work_days,
                workShift: employee.work_shift,
                services: services,
            };
        } catch (error) {
            throw error;
        }
    }

    async find(data: IFindEmployeeRequest): Promise<IFindEmployeeResponse> {
        // initial services if services is undefined
        // console.log(data)
        if (data.services.length === 0) {
            data['services'] = (
                await this.prismaService.services.findMany({
                    where: {
                        domain: data.domain,
                    },
                    select: {
                        id: true,
                    },
                })
            ).map(service => service.id);
            // console.log(data['services'])
        }
        // console.log(data)
        // filter data
        const filter = ['workDays', 'workShift', 'services', 'name'].reduce((acc, key) => {
            if (data[key]) {
                if (key === 'services') {
                    acc[key] = { some: { service_id: { in: data[key] } } };
                } else if (key === 'name') {
                    acc[key] = { contains: data[key] };
                } else if (key === 'workDays') {
                    acc['work_days'] = { hasEvery: data[key] };
                } else if (key === 'workShift') {
                    acc['work_shift'] = { hasEvery: data[key] };
                }
            }
            return acc;
        }, {});

        // console.log(data, filter);

        try {
            // find employees
            const employees = await this.prismaService.employee.findMany({
                where: filter,
                orderBy: { created_at: 'desc' },
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    phone: true,
                    image: true,
                    work_days: true,
                    work_shift: true,
                    services: {
                        select: { service: true },
                    },
                },
            });

            return {
                employees: employees.map(employee => {
                    const services = employee.services.map(
                        employeeService => employeeService.service,
                    );
                    return {
                        id: employee.id,
                        firstName: employee.first_name,
                        lastName: employee.last_name,
                        email: employee.email,
                        phone: employee.phone,
                        image: employee.image,
                        workDays: employee.work_days,
                        workShift: employee.work_shift,
                        services: services,
                    };
                }),
            };
        } catch (error) {
            throw error;
        }
    }

    async update(data: IUpdateEmployeeRequest): Promise<IUpdateEmployeeResponse> {
        const {
            user,
            id,
            firstName,
            lastName,
            email,
            phone,
            image,
            workDays,
            workShift,
            services,
        } = data;

        // check role of user
        if (user.role.toString() !== getEnumKeyByEnumValue(Role, Role.TENANT))
            throw new GrpcPermissionDeniedException('PERMISSION_DENIED');

        // check workDays and workShift
        if (
            !Array.isArray(workDays) ||
            !workDays.every(day =>
                (Object.values(WorkDays) as string[]).includes(day.toUpperCase()),
            )
        )
            throw new GrpcInvalidArgumentException('INVALID_WORK_DAYS');

        if (
            !Array.isArray(workShift) ||
            !workShift.every(shift =>
                (Object.values(WorkShift) as string[]).includes(shift.toUpperCase()),
            )
        )
            throw new GrpcInvalidArgumentException('INVALID_WORK_SHIFTS');

        // check workDays and workShift contain duplicate values
        if (new Set(workDays).size !== workDays.length)
            throw new GrpcInvalidArgumentException('DUPLICATE_WORK_DAYS');
        if (new Set(workShift).size !== workShift.length)
            throw new GrpcInvalidArgumentException('DUPLICATE_WORK_SHIFTS');

        try {
            // check employee is exist
            const employee = await this.prismaService.employee.findUnique({ where: { id } });
            if (!employee) throw new GrpcItemNotFoundException('EMPLOYEE_NOT_FOUND');

            // check services are exist
            if (
                (await this.prismaService.services.count({
                    where: { id: { in: services } },
                })) != services.length
            )
                throw new GrpcItemNotFoundException('SERVICES_NOT_FOUND');

            // create image link
            // const imageUrl = await this.supabaseService.uploadImageAndGetLink([image]);

            // update employee
            // await this.prismaService.employee.update({
            //     where: { id },
            //     data: {
            //         first_name: firstName,
            //         last_name: lastName,
            //         phone: phone,
            //         image: imageUrl[0],
            //         email,
            //         work_days: workDays,
            //         work_shift: workShift,
            //     },
            // });
            let updateData = {
                first_name: firstName,
                last_name: lastName,
                email,
                phone,
                work_days: workDays.length > 0 ? workDays : undefined,
                work_shift: workShift.length > 0 ? workShift : undefined,
                image
            };
            
            if (image !== undefined) {
                const imageUrl = await this.supabaseService.uploadImageAndGetLink([image]);
                updateData.image = imageUrl[0];
            }
            
            await this.prismaService.employee.update({
                where: { id },
                data: updateData,
            });
            // delete all services of employee
            await this.prismaService.employeeService.deleteMany({
                where: { employee_id: id },
            });

            // save services for employee
            for (const service of services) {
                await this.prismaService.employeeService.create({
                    data: {
                        employee_id: id,
                        service_id: service,
                    },
                });
            }

            return { id };
        } catch (error) {
            throw error;
        }
    }

    async delete(data: IDeleteEmployeeRequest): Promise<IDeleteEmployeeResponse> {
        const { user, id } = data;

        // check role of user
        if (user.role.toString() !== getEnumKeyByEnumValue(Role, Role.TENANT))
            throw new GrpcPermissionDeniedException('PERMISSION_DENIED');

        try {
            // check employee is exist
            const employee = await this.prismaService.employee.findUnique({ where: { id } });
            if (!employee) throw new GrpcItemNotFoundException('EMPLOYEE_NOT_FOUND');

            // delete all services of employee
            await this.prismaService.employeeService.deleteMany({
                where: { employee_id: id },
            });

            // delete employee
            await this.prismaService.employee.delete({ where: { id } });

            return { result: 'success' };
        } catch (error) {
            throw error;
        }
    }
}
