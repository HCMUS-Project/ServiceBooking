import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/core/prisma/prisma.module';
import { ServicesBookingService } from './services_booking.service';
import { ServicesBookingController } from './services_booking.controller';
import { SupabaseService } from 'src/util/supabase/supabase.service';

@Module({
    imports: [PrismaModule],
    controllers: [ServicesBookingController],
    providers: [ServicesBookingService, SupabaseService],
})
export class ServicesBookingModule {}
