import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/core/prisma/prisma.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { NodeMailerModule } from 'src/util/node_mailer/node_mailer.module';
import {  ExternalServiceModule  } from '../external_services/external.module';
import {  ProfileUserService  } from '../external_services/profileUsers/profile.service';
import { BrevoMailerModule } from 'src/util/brevo_mailer/brevo.module';
import {FindTenantProfileService} from '../external_services/tenant_profile/tenant_profile.service';
import { BullModule } from '@nestjs/bullmq';
import queueRegisterConfigs from 'src/core/queue/configs/registerQueue.config';

@Module({
    imports: [
        PrismaModule,
        NodeMailerModule,
        ExternalServiceModule, BrevoMailerModule,
        BullModule.registerQueue(queueRegisterConfigs.booking),
    ],
    controllers: [BookingController],
    providers: [BookingService, ProfileUserService, FindTenantProfileService],
})
export class BookingModule {}
