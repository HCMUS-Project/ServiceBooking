import { Module } from '@nestjs/common';
import { ServicesBookingModule } from './services/services_booking.module';

@Module({
    imports: [ServicesBookingModule],
})
export class FeaturesModule {}
