import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/core/prisma/prisma.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { NodeMailerModule } from 'src/util/node_mailer/node_mailer.module';

@Module({
    imports: [PrismaModule, NodeMailerModule],
    controllers: [BookingController],
    providers: [BookingService],
})
export class BookingModule {}
