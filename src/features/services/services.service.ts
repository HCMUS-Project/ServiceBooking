import { GrpcPermissionDeniedException } from 'nestjs-grpc-exceptions';
import { ICreateServiceRequest, ICreateServiceResponse } from './interface/services.interface';
import { getEnumKeyByEnumValue } from 'src/util/convert_enum/get_key_enum';
import { Role } from 'src/proto_build/auth/user_token_pb';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { GrpcItemExitException } from 'src/common/exceptions/exceptions';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ServicesService {
    constructor(private prismaService: PrismaService) {}

    async create(data: ICreateServiceRequest): Promise<ICreateServiceResponse> {
        const { user, timeService, ...service } = data;

        // check role of user
        if (user.role.toString() !== getEnumKeyByEnumValue(Role, Role.TENANT)) {
            throw new GrpcPermissionDeniedException('PERMISSION_DENIED');
        }

        try {
            // check service is exist
            if (
                (await this.prismaService.services.count({
                    where: { name: service.name, domain: user.domain },
                })) > 0
            ) {
                throw new GrpcItemExitException('SERVICE_EXIST');
            }

            // create service and time service
            const serviceNew = await this.prismaService.services.create({
                data: {
                    ...service,
                    domain: user.domain,
                    // Set the time_service field with the ID of the newly created serviceTime
                    time_service: {
                        create: {
                            start_time: timeService.startTime,
                            end_time: timeService.endTime,
                            duration: timeService.duration,
                            break_start: timeService.breakStart,
                            break_end: timeService.breakEnd,
                        },
                    },
                },
                // Include the time_service relation in the response
                include: {
                    time_service: true,
                },
            });

            console.log(
                await this.prismaService.services.findMany({ include: { time_service: true } }),
            );

            return {
                ...serviceNew,
                createdAt: serviceNew.created_at.getTime(),
                timeService: {
                    ...timeService,
                },
            };
        } catch (error) {
            throw error;
        }
    }

    async findOne() {}

    async find() {}

    async update() {}

    async delete() {}
}
