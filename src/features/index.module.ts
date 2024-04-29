import { Module } from '@nestjs/common';
import { ServicesBookingModule } from './services/services_booking.module';
import { VoucherModule } from './voucher/voucher.module';

@Module({
    imports: [ServicesBookingModule, VoucherModule],
})
export class FeaturesModule {}
