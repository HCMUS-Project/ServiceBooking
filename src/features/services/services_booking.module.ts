import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/core/prisma/prisma.module';
import { ServicesBookingService } from './services_booking.service';
import { ServicesBookingController } from './services_booking.controller';

@Module({
    imports: [PrismaModule],
    controllers: [ServicesBookingController],
    providers: [ServicesBookingService],
})
export class ServicesBookingModule {}
