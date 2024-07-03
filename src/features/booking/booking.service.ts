import {
    ICreateBookingRequest,
    ICreateBookingResponse,
    IDeleteBookingRequest,
    IDeleteBookingResponse,
    IFindAllBookingRequest,
    IFindAllBookingResponse,
    IFindOneRequest,
    IFindOneResponse,
    IFindSlotBookingsRequest,
    IFindSlotBookingsResponse,
    IGetBookingsReportOfListUsersRequest,
    IGetBookingsReportOfListUsersResponse,
    IGetBookingsValueByDateTypeRequest,
    IGetBookingsValueByDateTypeResponse,
    IUpdateStatusBookingRequest,
} from './interface/booking.interface';
import { WorkDays } from 'src/common/enums/workDays';
import { ISlotBooking } from './interface/slot_booking.interface';
import { WorkShift } from 'src/common/enums/workShift';
import { GrpcItemNotFoundException } from 'src/common/exceptions/exceptions';
import { Injectable } from '@nestjs/common';
import { convertTimeStringsToDateObjects } from 'src/util/time/TimeToDate';
import { getEnumKeyByEnumValue } from 'src/util/convert_enum/get_key_enum';
import { Role } from 'src/proto_build/auth/user_token_pb';
import { StatusBooking } from 'src/common/enums/status_booking.enum';
import { MailerService } from '@nestjs-modules/mailer';
import {
    GrpcPermissionDeniedException,
    GrpcUnauthenticatedException,
} from 'nestjs-grpc-exceptions';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { DateType } from 'src/proto_build/booking/booking_pb';
import { ProfileUserService } from '../external_services/profileUsers/profile.service';

const MINUTE_IN_MS = 60000;

@Injectable()
export class BookingService {
    constructor(
        private prismaService: PrismaService,
        private readonly mailerService: MailerService,
        private readonly profileUserService: ProfileUserService,
    ) {}

    private calPrice(amount, discountPercent, maxDiscount, minAppValue) {
        let discount = amount * discountPercent;
        if (discount > maxDiscount) discount = maxDiscount;
        if (discount > amount) discount = amount;
        if (amount < minAppValue) discount = 0;
        return amount - discount;
    }

    private getAllSlotInDay(
        startTime: string,
        endTime: string,
        breakStart: string,
        breakEnd: string,
        slotDuration: number,
        date: string,
    ): Date[] {
        const slots = [];
        let start = convertTimeStringsToDateObjects(startTime, new Date(date));
        const end = convertTimeStringsToDateObjects(endTime, new Date(date));
        const breakStartObj = convertTimeStringsToDateObjects(breakStart, new Date(date));
        const breakEndObj = convertTimeStringsToDateObjects(breakEnd, new Date(date));
        // console.log(start, end)
        while (start < end) {
            if (start < breakStartObj || start >= breakEndObj) {
                slots.push(start);
                start = new Date(start.getTime() + slotDuration * MINUTE_IN_MS);
            } else start = breakEndObj;
        }
        return slots;
    }

    private convertDateToDay(date: string): string {
        const dateObj = new Date(date);

        return (Object.values(WorkDays) as string[])[dateObj.getDay()];
    }

    private checkAvailableSlotWithEmployee(time: Date, workShift: string[]): boolean {
        const hours = time.getUTCHours();
        const shift =
            hours >= 6 && hours < 12
                ? WorkShift.MORNING
                : hours >= 12 && hours < 18
                  ? WorkShift.AFTERNOON
                  : hours >= 18 && hours < 22
                    ? WorkShift.EVENING
                    : WorkShift.NIGHT;
        return workShift.includes(shift);
    }

    async findSlotBookings(data: IFindSlotBookingsRequest): Promise<IFindSlotBookingsResponse> {
        const { user, ...dataFilter } = data;

        try {
            // get service
            const service = await this.prismaService.services.findUnique({
                where: {
                    id: dataFilter.service,
                    domain: user.domain,
                },
                select: {
                    id: true,
                    name: true,
                    time_service: true,
                },
            });
            if (!service) throw new GrpcItemNotFoundException('SERVICE_NOT_FOUND');
            // console.log(dataFilter)
            // get slot bookings
            const slotBookingsInDay = this.getAllSlotInDay(
                dataFilter.startTime ? dataFilter.startTime : service.time_service.start_time,
                dataFilter.endTime ? dataFilter.endTime : service.time_service.end_time,
                service.time_service.break_start,
                service.time_service.break_end,
                service.time_service.duration,
                dataFilter.date,
            );

            // get slot bookings with employee
            const daySlotBookings = this.convertDateToDay(dataFilter.date);

            // get employee
            const employees = await this.prismaService.employee.findMany({
                where: {
                    work_days: { has: daySlotBookings },
                    services: { some: { service_id: dataFilter.service } },
                },
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    work_shift: true,
                    image: true,
                    services: {
                        select: { service: true },
                    },
                },
            });

            // map slot bookings with employee
            let slotBookingsWithEmployee: ISlotBooking[] = await Promise.all(
                slotBookingsInDay.map(async slotBooking => {
                    let employeesForSlot = employees
                        .filter(emp =>
                            this.checkAvailableSlotWithEmployee(slotBooking, emp.work_shift),
                        )
                        .map(emp => ({
                            id: emp.id,
                            firstName: emp.first_name,
                            lastName: emp.last_name,
                            email: emp.email,
                            image: emp.image,
                        }));

                    // check employee is booked
                    employeesForSlot = await Promise.all(
                        employeesForSlot.map(async emp => {
                            const count = await this.prismaService.booking.count({
                                where: {
                                    employee_id: emp.id,
                                    start_time: slotBooking,
                                    status: { not: StatusBooking.CANCEL },
                                },
                            });
                            return count == 0 ? emp : null;
                        }),
                    );

                    // Filter out null values
                    employeesForSlot = employeesForSlot.filter(emp => emp !== null);
                    return {
                        date: dataFilter.date,
                        startTime: slotBooking.toISOString(),
                        endTime: new Date(
                            slotBooking.getTime() + service.time_service.duration * MINUTE_IN_MS,
                        ).toISOString(),
                        employees: employeesForSlot,
                        service: data.service,
                    };
                }),
            );

            return {
                slotBookings: slotBookingsWithEmployee,
            };
        } catch (error) {
            throw error;
        }
    }

    async createBooking(data: ICreateBookingRequest): Promise<ICreateBookingResponse> {
        try {
            const { user, ...dataCreate } = data;

            // check role user
            if (user.role.toString() !== getEnumKeyByEnumValue(Role, Role.USER)) {
                throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
            }

            // get service
            const service = await this.prismaService.services.findUnique({
                where: {
                    id: dataCreate.service,
                    domain: user.domain,
                },
                select: {
                    id: true,
                    name: true,
                    time_service: true,
                    price: true,
                },
            });
            if (!service) throw new GrpcItemNotFoundException('SERVICE_NOT_FOUND');

            //check voucher
            if (dataCreate.voucher) {
                var voucherDiscount = await this.prismaService.voucher.findUnique({
                    where: {
                        id: dataCreate.voucher,
                        Service: {
                            id: dataCreate.service,
                        },
                    },
                    select: {
                        id: true,
                        expire_at: true,
                        discount_percent: true,
                        max_discount: true,
                        min_app_value: true,
                    },
                });
                if (!voucherDiscount || voucherDiscount.expire_at < new Date())
                    throw new GrpcItemNotFoundException('VOUCHER_NOT_FOUND');
            }

            // get slot bookings with employee
            const daySlotBookings = this.convertDateToDay(dataCreate.date);

            // get employee
            const employees = await this.prismaService.employee.findMany({
                where: {
                    AND: [
                        {
                            work_days: { has: daySlotBookings },
                            services: { some: { service_id: dataCreate.service } },
                            Booking: {
                                none: {
                                    start_time: new Date(dataCreate.startTime),
                                    status: { not: StatusBooking.CANCEL },
                                },
                            },
                        },
                        // if employee is none then no query with id
                        dataCreate.employee ? { id: dataCreate.employee } : {},
                    ],
                },
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    work_shift: true,
                    services: {
                        select: { service: true },
                    },
                },
            });

            // check employee available
            let employeesForSlot = employees
                .filter(emp =>
                    this.checkAvailableSlotWithEmployee(
                        new Date(dataCreate.startTime),
                        emp.work_shift,
                    ),
                )
                .map(emp => ({
                    id: emp.id,
                    firstName: emp.first_name,
                    lastName: emp.last_name,
                    email: emp.email,
                }));

            if (employeesForSlot.length == 0) throw new GrpcItemNotFoundException('NO_EMPLOYEE');

            // Prepare the booking data
            let bookingData: any = {
                start_time: new Date(dataCreate.startTime),
                end_time: new Date(
                    new Date(dataCreate.startTime).getTime() +
                        service.time_service.duration * MINUTE_IN_MS,
                ),
                Service: {
                    connect: {
                        id: dataCreate.service,
                    },
                },
                Employee: {
                    connect: {
                        id: employeesForSlot[Math.floor(Math.random() * employeesForSlot.length)]
                            .id,
                    },
                },
                note: dataCreate.note,
                status: StatusBooking.PENDING,
                user: user.email,
                total_price: service.price,
            };

            // Conditionally add voucher and adjust price if applicable
            if (voucherDiscount) {
                bookingData.Voucher = {
                    connect: {
                        id: dataCreate.voucher,
                    },
                };
                console.log('check');
                bookingData.total_price = this.calPrice(
                    service.price,
                    voucherDiscount.discount_percent,
                    voucherDiscount.max_discount,
                    voucherDiscount.min_app_value,
                );
            }

            // find phone number in auth service
            const phoneNumber = (await this.profileUserService.getProfile({user: user})).phone
            if (phoneNumber){
                bookingData.phone = phoneNumber
            }

            // Create booking
            const booking = await this.prismaService.booking.create({
                data: bookingData,
            });

            return {
                id: booking.id,
            };
        } catch (error) {
            throw error;
        }
    }

    async findOne(data: IFindOneRequest): Promise<IFindOneResponse> {
        try {
            const booking = await this.prismaService.booking.findUnique({
                where: {
                    id: data.id,
                    user: data.user.email,
                },
                select: {
                    id: true,
                    start_time: true,
                    end_time: true,
                    note: true,
                    note_cancel: true,
                    status: true,
                    phone: true,
                    Employee: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                            email: true,
                            image: true,
                        },
                    },
                    Service: {
                        select: {
                            id: true,
                            name: true,
                            images: true,
                        },
                    },
                    voucher_id: true,
                    total_price: true,
                    created_at: true,
                },
            });

            if (!booking) throw new GrpcItemNotFoundException('BOOKING_NOT_FOUND');

            return {
                id: booking.id,
                date: booking.start_time.toISOString(),
                endTime: booking.end_time.toISOString(),
                startTime: booking.start_time.toISOString(),
                voucherId: booking.voucher_id,
                note: booking.note,
                noteCancel: booking.note_cancel,
                status: booking.status,
                employee: {
                    id: booking.Employee.id,
                    firstName: booking.Employee.first_name,
                    lastName: booking.Employee.last_name,
                    email: booking.Employee.email,
                    image: booking.Employee.image,
                },
                service: {
                    id: booking.Service.id,
                    name: booking.Service.name,
                    images: booking.Service.images,
                },
                user: data.user.email,
                phone: booking.phone,
                totalPrice: booking.total_price.toNumber(),
                createdAt: booking.created_at.toISOString(),
            };
        } catch (error) {
            throw error;
        }
    }

    // async findBooking(data: IFindOneRequest): Promise<IFindOneResponse> {
    //     try {
    //         const booking = await this.prismaService.booking.findUnique({
    //             where: {
    //                 id: data.id,
    //             },
    //             select: {
    //                 id: true,
    //                 start_time: true,
    //                 end_time: true,
    //                 note: true,
    //                 status: true,
    //                 note_cancel: true,
    //                 Employee: {
    //                     select: {
    //                         id: true,
    //                         first_name: true,
    //                         last_name: true,
    //                         email: true,
    //                         image: true,
    //                     },
    //                 },
    //                 Service: {
    //                     select: {
    //                         id: true,
    //                         name: true,
    //                         images: true,
    //                     },
    //                 },
    //                 user: true,
    //                 total_price: true,
    //                 voucher_id: true,
    //                 created_at: true,
    //             },
    //         });

    //         if (!booking) throw new GrpcItemNotFoundException('BOOKING_NOT_FOUND');

    //         return {
    //             user: booking.user,
    //             id: booking.id,
    //             date: booking.start_time.toISOString(),
    //             endTime: booking.end_time.toISOString(),
    //             startTime: booking.start_time.toISOString(),
    //             noteCancel: booking.note_cancel,
    //             note: booking.note,
    //             status: booking.status,
    //             employee: {
    //                 id: booking.Employee.id,
    //                 firstName: booking.Employee.first_name,
    //                 lastName: booking.Employee.last_name,
    //                 email: booking.Employee.email,
    //                 image: booking.Employee.image,
    //             },
    //             service: {
    //                 id: booking.Service.id,
    //                 name: booking.Service.name,
    //                 images: booking.Service.images,
    //             },
    //             // TODO calculate total price
    //             totalPrice: Number(booking.total_price),
    //             voucherId: booking.voucher_id,
    //             createdAt: booking.created_at.toISOString(),
    //         };
    //     } catch (error) {
    //         throw error;
    //     }
    // }

    async updateStatusBooking(data: IUpdateStatusBookingRequest): Promise<IFindOneResponse> {
        const { user, status, id } = data;

        // if (user.role.toString() === getEnumKeyByEnumValue(Role, Role.TENANT)) {
        //     throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
        // }

        try {
            // check booking exist
            const bookingExist = await this.prismaService.booking.findFirst({
                where: {
                    id,
                    Service: {
                        domain: user.domain,
                    },
                },
                select: { status: true },
            });
            if (!bookingExist) throw new GrpcItemNotFoundException('BOOKING_NOT_FOUND');

            // check status booking
            if (bookingExist.status.toUpperCase() !== StatusBooking.PENDING)
                throw new GrpcPermissionDeniedException('BOOKING_CANNOT_UPDATE_STATUS');

            // update status booking
            const bookingUpdate = await this.prismaService.booking.update({
                where: {
                    id,
                    Service: {
                        domain: user.domain,
                    },
                },
                data: {
                    status: status.toUpperCase(),
                },
                select: {
                    id: true,
                    start_time: true,
                    end_time: true,
                    note: true,
                    status: true,
                    note_cancel: true,
                    phone: true,
                    Employee: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                            email: true,
                            image: true,
                        },
                    },
                    Service: {
                        select: {
                            id: true,
                            name: true,
                            images: true,
                        },
                    },
                    user: true,
                    total_price: true,
                    voucher_id: true,
                    created_at: true,
                },
            });

            return {
                user: bookingUpdate.user,
                id: bookingUpdate.id,
                date: bookingUpdate.start_time.toISOString(),
                endTime: bookingUpdate.end_time.toISOString(),
                startTime: bookingUpdate.start_time.toISOString(),
                noteCancel: bookingUpdate.note_cancel,
                note: bookingUpdate.note,
                status: bookingUpdate.status,
                phone: bookingUpdate.phone,
                employee: {
                    id: bookingUpdate.Employee.id,
                    firstName: bookingUpdate.Employee.first_name,
                    lastName: bookingUpdate.Employee.last_name,
                    email: bookingUpdate.Employee.email,
                    image: bookingUpdate.Employee.image,
                },
                service: {
                    id: bookingUpdate.Service.id,
                    name: bookingUpdate.Service.name,
                    images: bookingUpdate.Service.images,
                },
                // TODO calculate total price
                totalPrice: Number(bookingUpdate.total_price),
                voucherId: bookingUpdate.voucher_id,
                createdAt: bookingUpdate.created_at.toISOString(),
            };
        } catch (error) {
            throw error;
        }
    }

    async deleteBooking(data: IDeleteBookingRequest): Promise<IDeleteBookingResponse> {
        const { user, note, id } = data;

        try {
            // check booking
            const booking = await this.prismaService.booking.findFirst({
                where: {
                    AND: [
                        {
                            id,
                            Service: {
                                domain: user.domain,
                            },
                        },
                        user.role.toString() !== getEnumKeyByEnumValue(Role, Role.TENANT)
                            ? { user: user.email }
                            : {},
                    ],
                },
                select: { status: true },
            });

            if (!booking) throw new GrpcItemNotFoundException('BOOKING_NOT_FOUND');
            if (booking.status !== StatusBooking.PENDING)
                throw new GrpcPermissionDeniedException('BOOKING_CANNOT_DELETE');

            // update status booking
            const bookingDeleted = await this.prismaService.booking.update({
                where: {
                    id,
                },
                data: {
                    status: StatusBooking.CANCEL,
                    note_cancel: note,
                },
                select: {
                    id: true,
                    start_time: true,
                    note: true,
                    status: true,
                    created_at: true,
                    Service: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    user: true,
                },
            });

            // send email to user if booking is canceled by tenant
            if (user.role.toString() === getEnumKeyByEnumValue(Role, Role.TENANT)) {
                console.log('send email to user');
                await this.mailerService.sendMail({
                    to: bookingDeleted.user,
                    subject: 'Booking Canceled',
                    text: `Your booking with service ${bookingDeleted.Service.name} at ${bookingDeleted.start_time.toUTCString()} is canceled.\nBecause ${note}`,
                });
            }
        } catch (error) {
            throw error;
        }

        return { result: 'success' };
    }

    async findAllBookingWithFilter(
        email: string | string[],
        domain: string,
        dataFilter: Omit<IFindAllBookingRequest, 'user'>,
    ): Promise<IFindAllBookingResponse> {
        // base on services
        let serviceIds = dataFilter.services;

        if (serviceIds.length === 0) {
            const services = await this.prismaService.services.findMany({
                where: {
                    domain: domain,
                },
                select: {
                    id: true,
                },
            });
            serviceIds = services.map(service => service.id);
        }

        // base on date
        let startDate = new Date(dataFilter.date[0]);
        let endDate = new Date(dataFilter.date[1]);

        // Ensure startDate is the earlier date and endDate is the later date
        if (startDate > endDate) {
            [startDate, endDate] = [endDate, startDate];
        }

        startDate.setHours(0, 0, 0, 0); // set start of the day
        endDate.setHours(23, 59, 59, 999); // set end of the day
        // base on status
        const statuses = dataFilter.status;

        // divide result base on page and limit per page
        const page = dataFilter.page || 1;
        const limit = dataFilter.limit || 10;
        const skip = (page - 1) * limit;

        let whereClause: any = {
            user: email,
        };

        if (serviceIds.length > 0) {
            whereClause.service_id = {
                in: serviceIds,
            };
        }

        if (dataFilter.date.length > 0) {
            whereClause.start_time = {
                gte: startDate,
                lt: endDate,
            };
        }

        if (statuses.length > 0) {
            whereClause.status = {
                in: statuses,
            };
        }

        let bookingsWithDataFilter = await this.prismaService.booking.findMany({
            where: whereClause,
            take: limit,
            skip: skip,
            orderBy: {
                created_at: 'desc',
            },
            select: {
                id: true,
                start_time: true,
                end_time: true,
                note: true,
                note_cancel: true,
                status: true,
                phone: true,
                Employee: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        image: true,
                    },
                },
                Service: {
                    select: {
                        id: true,
                        name: true,
                        images: true,
                    },
                },
                voucher_id: true,
                total_price: true,
                user: true,
                created_at: true,
            },
        });

        return {
            bookings: bookingsWithDataFilter.map(booking => ({
                id: booking.id,
                date: booking.start_time.toISOString(),
                endTime: booking.end_time.toISOString(),
                startTime: booking.start_time.toISOString(),
                voucherId: booking.voucher_id,
                note: booking.note,
                noteCancel: booking.note_cancel,
                status: booking.status,
                phone: booking.phone,
                employee: {
                    id: booking.Employee.id,
                    firstName: booking.Employee.first_name,
                    lastName: booking.Employee.last_name,
                    email: booking.Employee.email,
                    image: booking.Employee.image,
                },
                service: {
                    id: booking.Service.id,
                    name: booking.Service.name,
                    images: booking.Service.images,
                },
                user: booking.user,
                totalPrice: booking.total_price.toNumber(),
                createdAt: booking.created_at.toISOString(),
            })),
        };
    }

    async findAllBooking(data: IFindAllBookingRequest): Promise<IFindAllBookingResponse> {
        const { user, ...dataFilter } = data;

        try {
            if (user.role.toString() === getEnumKeyByEnumValue(Role, Role.TENANT)) {
                return await this.findAllBookingWithFilter(undefined, user.domain, dataFilter);
            } else if (user.role.toString() === getEnumKeyByEnumValue(Role, Role.USER)) {
                return await this.findAllBookingWithFilter(user.email, user.domain, dataFilter);
            } else {
                throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
            }
        } catch (error) {
            throw error;
        }
    }

    async getBookingsReportOfListUsers(
        data: IGetBookingsReportOfListUsersRequest,
    ): Promise<IGetBookingsReportOfListUsersResponse> {
        const { user, ...listUsers } = data;
        // console.log(data);
        if (user.role.toString() !== getEnumKeyByEnumValue(Role, Role.TENANT)) {
            throw new GrpcUnauthenticatedException('PERMISSION_DENIED');
        }

        if (user.domain === '') throw new GrpcUnauthenticatedException('DOMAIN_IS_EMPTY');

        try {
            const bookings = await this.prismaService.booking.groupBy({
                by: ['user'],
                where: {
                    AND: [
                        {
                            status: 'SUCCESS',
                        },
                        {
                            user: {
                                in: listUsers.emails,
                            },
                        },
                        {
                            Service: {
                                domain: user.domain,
                            },
                        },
                    ],
                },
                _count: {
                    id: true,
                },
            });
            // console.log(orders);

            return {
                reportBooking: bookings.map(booking => ({
                    email: booking.user,
                    totalBooking: booking._count.id,
                })),
            };
        } catch (error) {
            throw error;
        }
    }

    async getBookingsValueByDateType(
        data: IGetBookingsValueByDateTypeRequest,
    ): Promise<IGetBookingsValueByDateTypeResponse> {
        if (data.user.role.toString() !== getEnumKeyByEnumValue(Role, Role.TENANT)) {
            throw new GrpcUnauthenticatedException('PERMISSION_DENIED');
        }
        try {
            const bookings = await this.prismaService.booking.findMany({
                where: {
                    AND: [
                        {
                            status: 'SUCCESS',
                        },
                        {
                            Service: {
                                domain: data.user.domain,
                            },
                        },
                    ],
                },
                select: {
                    id: true,
                    total_price: true,
                    created_at: true,
                },
            });

            // console.log(bookings)

            let totalBookings = 0;
            let totalValue = 0;
            const reportBookings = [];

            if (data.type.toString() === getEnumKeyByEnumValue(DateType, DateType.WEEK)) {
                const bookingsByWeek: {
                    [key: string]: { totalBookings: number; totalValue: number };
                } = {};

                bookings.forEach(booking => {
                    // console.log(order);
                    const dayOfWeek = this.getDayOfWeek(new Date(booking.created_at));
                    // console.log(weekNumber);
                    if (bookingsByWeek[dayOfWeek]) {
                        bookingsByWeek[dayOfWeek].totalBookings += 1;
                        bookingsByWeek[dayOfWeek].totalValue += Number(booking.total_price);
                    } else {
                        bookingsByWeek[dayOfWeek] = {
                            totalBookings: 1,
                            totalValue: Number(booking.total_price),
                        };
                    }
                    totalBookings += 1;
                    totalValue += Number(booking.total_price);
                });
                for (const [week, report] of Object.entries(bookingsByWeek)) {
                    reportBookings.push({
                        type: week,
                        totalBookings: report.totalBookings,
                        totalValue: report.totalValue,
                    });
                }
            } else if (data.type.toString() === getEnumKeyByEnumValue(DateType, DateType.YEAR)) {
                // if (data.type === 'year')
                const bookingsByYear: {
                    [key: string]: { totalBookings: number; totalValue: number };
                } = {};

                bookings.forEach(booking => {
                    // console.log(booking);
                    const mongth = this.getMonth(new Date(booking.created_at));
                    // console.log(mongth);
                    if (bookingsByYear[mongth]) {
                        bookingsByYear[mongth].totalBookings += 1;
                        bookingsByYear[mongth].totalValue += Number(booking.total_price);
                    } else {
                        bookingsByYear[mongth] = {
                            totalBookings: 1,
                            totalValue: Number(booking.total_price),
                        };
                    }
                    totalBookings += 1;
                    totalValue += Number(booking.total_price);
                });

                for (const [week, report] of Object.entries(bookingsByYear)) {
                    reportBookings.push({
                        type: week,
                        totalBookings: report.totalBookings,
                        totalValue: report.totalValue,
                    });
                }
            } else if (data.type.toString() === getEnumKeyByEnumValue(DateType, DateType.MONTH)) {
                // if (data.type === 'year')
                const bookingsByWeekInMonth: {
                    [key: string]: { totalBookings: number; totalValue: number };
                } = {};

                bookings.forEach(booking => {
                    // console.log(booking.created_at.getUTCMonth() , new Date().getMonth())
                    if (booking.created_at.getUTCMonth() === new Date().getMonth()) {
                        // console.log('haha');
                        const weekNumberInMonth = this.getWeekOfMonth(new Date(booking.created_at));
                        // console.log(weekNumberInMonth);
                        if (bookingsByWeekInMonth[weekNumberInMonth]) {
                            bookingsByWeekInMonth[weekNumberInMonth].totalBookings += 1;
                            bookingsByWeekInMonth[weekNumberInMonth].totalValue += Number(
                                booking.total_price,
                            );
                        } else {
                            bookingsByWeekInMonth[weekNumberInMonth] = {
                                totalBookings: 1,
                                totalValue: Number(booking.total_price),
                            };
                        }
                        totalBookings += 1;
                        totalValue += Number(booking.total_price);
                    }
                });

                for (const [week, report] of Object.entries(bookingsByWeekInMonth)) {
                    reportBookings.push({
                        type: week,
                        totalBookings: report.totalBookings,
                        totalValue: report.totalValue,
                    });
                }
            }

            return {
                report: reportBookings,
                total: totalBookings,
                value: totalValue,
            };
        } catch (error) {
            throw error;
        }
    }

    getWeekOfMonth(date: Date): string {
        // Get the first day of the month
        const firstDayOfMonth = new Date(date.getFullYear(), date.getUTCMonth(), 1);
        // Get the day of the week for the first day of the month (0 is Sunday, 6 is Saturday)
        let firstDayOfWeek = firstDayOfMonth.getDay();

        // Adjust to make Monday the first day of the week
        // If the first day is Sunday (0), set it to 7 for easier calculations
        if (firstDayOfWeek === 0) {
            firstDayOfWeek = 7;
        }

        // Calculate the adjusted date for Monday start week
        // console.log(date.getUTCDate() + firstDayOfWeek);
        const adjustedDate = date.getUTCDate() + firstDayOfWeek - 2;
        const weekNumber = Math.floor(adjustedDate / 7) + 1;

        return `WEEK_${weekNumber}`;
    }

    getDayOfWeek(date: Date): string {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getUTCDay()];
    }

    getMonth(date: Date): string {
        const months = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
        ];
        return months[date.getUTCMonth()];
    }
}
