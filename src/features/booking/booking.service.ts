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
import { StatusBooking, TypeBooking } from 'src/common/enums/status_booking.enum';
import { MailerService } from '@nestjs-modules/mailer';
import {
    GrpcPermissionDeniedException,
    GrpcUnauthenticatedException,
} from 'nestjs-grpc-exceptions';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { DateType } from 'src/proto_build/booking/booking_pb';
import { ProfileUserService } from '../external_services/profileUsers/profile.service';
import { BrevoMailerService, SmtpParams } from 'src/util/brevo_mailer/brevo.service';
import { FindTenantProfileService } from '../external_services/tenant_profile/tenant_profile.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

const MINUTE_IN_MS = 60000;

@Injectable()
export class BookingService {
    constructor(
        private prismaService: PrismaService,
        private readonly mailerService: MailerService,
        private readonly profileGrpcService: ProfileUserService,
        private readonly findTenantProfileService: FindTenantProfileService,
        private readonly brevoMailerService: BrevoMailerService,
        @InjectQueue('booking') private bookingQueue: Queue,
    ) {}

    /**
     * Calculates the price after applying a discount.
     * @param amount - The original price.
     * @param discountPercent - The percentage of discount to be applied.
     * @param maxDiscount - The maximum discount amount that can be applied.
     * @param minAppValue - The minimum applicable value for the discount to be applied.
     * @returns The price after applying the discount.
     */
    private calPrice(
        amount: number,
        discountPercent: number,
        maxDiscount: number,
        minAppValue: number,
    ) {
        let discount = amount * discountPercent;
        if (discount > maxDiscount) discount = maxDiscount;
        if (discount > amount) discount = amount;
        if (amount < minAppValue) discount = 0;
        return amount - discount;
    }

    /**
     * Retrieves all slots within a day based on the provided parameters.
     *
     * @param startTime - The start time of the day in string format.
     * @param endTime - The end time of the day in string format.
     * @param breakStart - The start time of the break in string format.
     * @param breakEnd - The end time of the break in string format.
     * @param slotDuration - The duration of each slot in minutes.
     * @param date - The date of the day in string format.
     * @returns An array of Date objects representing the slots within the day.
     */
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

    /**
     * Converts a given date string to the corresponding day of the week.
     * @param date - The date string to convert.
     * @returns The day of the week as a string.
     */
    private convertDateToDay(date: string): string {
        const dateObj = new Date(date);

        return (Object.values(WorkDays) as string[])[dateObj.getDay()];
    }

    /**
     * Checks if the given time slot is available for booking with the specified work shifts.
     * @param time - The time slot to check.
     * @param workShift - An array of work shifts to compare against.
     * @returns A boolean indicating whether the time slot is available with the given work shifts.
     */
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

    /**
     * Finds slot bookings based on the provided data.
     * @param data - The data for finding slot bookings.
     * @returns A promise that resolves to the response containing the slot bookings.
     * @throws {GrpcItemNotFoundException} If the service is not found.
     * @throws {Error} If an error occurs while finding the slot bookings.
     */
    async findSlotBookings(data: IFindSlotBookingsRequest): Promise<IFindSlotBookingsResponse> {
        const { user, ...dataFilter } = data;

        try {
            // get service
            const service = await this.prismaService.services.findUnique({
                where: {
                    id: dataFilter.service,
                    domain: user.domain,
                    deleted_at: null,
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

    /**
     * Creates a booking based on the provided data.
     * @param data - The data for creating a booking.
     * @returns A promise that resolves to the created booking response.
     * @throws {GrpcPermissionDeniedException} If the user does not have the required role.
     * @throws {GrpcItemNotFoundException} If the service or voucher is not found.
     * @throws {GrpcItemNotFoundException} If no employee is available for the specified slot.
     */
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
                    deleted_at: null,
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
                        deleted_at: null,
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

            //todo: find phone number in auth service
            const phoneNumber = (await this.profileGrpcService.getProfile({ user: user })).phone;
            if (phoneNumber) {
                bookingData.phone = phoneNumber;
            }

            // Create booking
            const booking = await this.prismaService.booking.create({
                data: bookingData,
            });

            this.bookingQueue.add(
                'notify',
                {
                    email: user.email,
                    service: {
                        name: service.name,
                    },
                    employees: {
                        firstName: employeesForSlot[0].firstName,
                        lastName: employeesForSlot[0].lastName,
                    },
                    booking_id: booking.id,
                    domain: user.domain,
                    type: TypeBooking.Created,
                },
                {
                    attempts: 3,
                    removeOnComplete: true,
                },
            );

            return {
                id: booking.id,
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Finds a booking based on the provided criteria.
     *
     * @param data - The criteria to search for a booking.
     * @returns A promise that resolves to the found booking.
     * @throws {GrpcItemNotFoundException} If the booking is not found.
     */
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

    /**
     * Updates the status of a booking.
     * @param data - The data required to update the status of the booking.
     * @returns A promise that resolves to the updated booking information.
     * @throws {GrpcItemNotFoundException} If the booking is not found.
     * @throws {GrpcPermissionDeniedException} If the booking status cannot be updated.
     */
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

    /**
     * Deletes a booking based on the provided data.
     * @param data - The data required to delete a booking.
     * @returns A promise that resolves to the delete booking response.
     * @throws {GrpcItemNotFoundException} If the booking is not found.
     * @throws {GrpcPermissionDeniedException} If the booking cannot be deleted.
     */
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
                    end_time: true,
                    Service: {
                        select: {
                            id: true,
                            name: true,
                            price: true,
                            images: true,
                            description: true,
                        },
                    },
                    Employee: {
                        select: {
                            first_name: true,
                            last_name: true,
                            image: true,
                        },
                    },
                    user: true,
                },
            });

            // send email to user if booking is canceled by tenant
            if (user.role.toString() === getEnumKeyByEnumValue(Role, Role.TENANT)) {
                // console.log('send email to user');
                // await this.mailerService.sendMail({
                //     to: bookingDeleted.user,
                //     subject: 'Booking Canceled',
                //     text: `Your booking with service ${bookingDeleted.Service.name} at ${bookingDeleted.start_time.toUTCString()} is canceled.\nBecause ${note}`,
                // });
                const profiles = await this.profileGrpcService.getAllUserProfile({
                    user: data.user,
                });
                const profileNameCancel = profiles.users.find(
                    user => user.email === bookingDeleted.user,
                );
                const tenantProfile = (
                    await this.findTenantProfileService.findTenantProfileByTenantId({
                        domain: data.user.domain,
                        tenantId: undefined,
                    })
                ).tenantProfile;
                const to = [
                    {
                        email: bookingDeleted.user,
                        name: profileNameCancel.name,
                    },
                ];
                const templateId = 4;
                const linkDesktop = 'https://saas-30shine.vercel.app';
                const linkMobile = 'https://nvukhoi.id.vn/result';
                const params = {
                    email: bookingDeleted.user,
                    type: 'Booking',
                    name: profileNameCancel.name,
                    domain: data.user.domain,
                    id: bookingDeleted.id,
                    date: bookingDeleted.created_at.toISOString(),
                    noteCancel: data.note,
                    logolink: tenantProfile.logo,
                    descriptionTenant: tenantProfile.description,
                    trackOrderLinkDesktop: `${linkDesktop}/user-info/order`,
                    trackOrderLinkMobile: `${linkMobile}`,
                    continueShoppingLinkDesktop: `${linkDesktop}`,
                    continueShoppingLinkMobile: `${linkMobile},`,
                    items: [
                        {
                            name: bookingDeleted.Service.name,
                            price: bookingDeleted.Service.price,
                            img: bookingDeleted.Service.images[0],
                            startTime: `${bookingDeleted.start_time.getHours()}:${bookingDeleted.start_time.getMinutes()}`,
                            endTime: `${bookingDeleted.end_time.getHours()}:${bookingDeleted.end_time.getMinutes()}`,
                            description: bookingDeleted.Service.description,
                            employeeFirstName: bookingDeleted.Employee.first_name,
                            employeeLastName: bookingDeleted.Employee.last_name,
                            imgEmployee: bookingDeleted.Employee.image,
                        },
                    ],
                } as SmtpParams;
                await this.brevoMailerService.sendTransactionalEmail(to, templateId, params);
            }

            // send notify to worker
            this.bookingQueue.add(
                'notify',
                {
                    email: user.email,
                    service: {
                        id: bookingDeleted.Service.id,
                        name: bookingDeleted.Service.name,
                    },
                    employees: {
                        firstName: bookingDeleted.Employee.first_name,
                        lastName: bookingDeleted.Employee.last_name,
                    },
                    booking: {
                        id: bookingDeleted.id,
                        startTime: bookingDeleted.start_time,
                        endTime: bookingDeleted.end_time,
                    },
                    domain: user.domain,
                    type: TypeBooking.Cancel,
                },
                {
                    attempts: 3,
                    removeOnComplete: true,
                },
            );
        } catch (error) {
            throw error;
        }

        return { result: 'success' };
    }

    /**
     * Retrieves all bookings with the specified filter criteria.
     * @param email - The email address of the user.
     * @param domain - The domain of the bookings.
     * @param dataFilter - The filter criteria for the bookings.
     * @returns A promise that resolves to an object containing the filtered bookings.
     */
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

        if (serviceIds.length >= 0) {
            whereClause.service_id = {
                in: serviceIds,
            };
        }

        if (dataFilter.date.length > 0) {
            whereClause.start_time = {
                gte: startDate,
                lte: endDate,
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

    /**
     * Retrieves all bookings based on the provided filter criteria.
     * @param data - The request object containing the filter criteria.
     * @returns A promise that resolves to the response object containing the filtered bookings.
     * @throws Throws an error if the user does not have the necessary permissions.
     */
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

    /**
     * Retrieves the bookings report for a list of users.
     * @param data - The request data containing the list of users and the current user.
     * @returns A promise that resolves to the bookings report for the list of users.
     * @throws {GrpcUnauthenticatedException} If the current user does not have the required permissions or if the domain is empty.
     */
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

    /**
     * Retrieves bookings value by date type.
     *
     * @param data - The request data containing user information and date type.
     * @returns A promise that resolves to the response containing the bookings report, total bookings, and total value.
     * @throws {GrpcUnauthenticatedException} If the user does not have the required permissions.
     * @throws {Error} If an error occurs while retrieving the bookings.
     */
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
                    if (this.isSameWeek(booking.created_at, new Date())) {
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
                    }
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
                    if (booking.created_at.getUTCFullYear() === new Date().getUTCFullYear()) {
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
                    }
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
                    if (
                        booking.created_at.getUTCMonth() === new Date().getMonth() &&
                        booking.created_at.getUTCFullYear() === new Date().getUTCFullYear()
                    ) {
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

    isSameWeek(date1: Date, date2: Date): boolean {
        // Get the start of the week (Monday) for the first date
        const startOfWeek1 = new Date(date1);
        startOfWeek1.setDate(date1.getDate() - date1.getDay() + (date1.getDay() === 0 ? -6 : 1));

        // Get the start of the week (Monday) for the second date
        const startOfWeek2 = new Date(date2);
        startOfWeek2.setDate(date2.getDate() - date2.getDay() + (date2.getDay() === 0 ? -6 : 1));

        // Compare the start of the week dates
        return (
            startOfWeek1.getFullYear() === startOfWeek2.getFullYear() &&
            startOfWeek1.getMonth() === startOfWeek2.getMonth() &&
            startOfWeek1.getDate() === startOfWeek2.getDate()
        );
    }

    /**
     * Returns the week number of the given date within its month.
     *
     * @param date - The date for which to calculate the week number.
     * @returns The week number in the format "WEEK_X", where X is the week number.
     */
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

    /**
     * Returns the day of the week for a given date.
     * @param date - The date for which to get the day of the week.
     * @returns The day of the week as a string.
     */
    getDayOfWeek(date: Date): string {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getUTCDay()];
    }

    /**
     * Returns the month name for a given date.
     * @param date - The date object for which to retrieve the month name.
     * @returns The name of the month.
     */
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
