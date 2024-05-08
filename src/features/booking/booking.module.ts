import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/core/prisma/prisma.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

@Module({
    imports: [PrismaModule],
    controllers: [BookingController],
    providers: [BookingService],
})
export class BookingModule {}
