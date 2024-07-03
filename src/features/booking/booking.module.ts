import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/core/prisma/prisma.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { NodeMailerModule } from 'src/util/node_mailer/node_mailer.module';
import {ExternalServiceModule} from '../external_services/external.module';
import {ProfileUserService} from '../external_services/profileUsers/profile.service';

@Module({
    imports: [PrismaModule, NodeMailerModule, ExternalServiceModule],
    controllers: [BookingController],
    providers: [BookingService, ProfileUserService],
})
export class BookingModule {}
